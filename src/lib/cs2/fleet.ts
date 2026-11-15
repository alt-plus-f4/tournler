import 'server-only';
import type { Cs2Server, ServerHost } from '@prisma/client';
import { db } from '@/lib/db';
import { agentClient, AgentError, type AgentServerSpec, type AgentTarget, type PowerAction } from './agent-client';
import { generateSecret, openSecret, sealSecret } from './secret-box';
import { getEnvServerPool } from './server-pool';

export class FleetError extends Error {
	constructor(
		message: string,
		readonly status: 400 | 404 | 409 | 502 = 400,
	) {
		super(message);
		this.name = 'FleetError';
	}
}

const MAX_GAME_PORT = 65000;

export function agentTargetFor(host: Pick<ServerHost, 'agentUrl' | 'agentSecretEnc'>): AgentTarget {
	if (!host.agentUrl || !host.agentSecretEnc) throw new FleetError('This host has no agent configured, so servers can only be registered by hand', 409);
	return { agentUrl: host.agentUrl, secret: openSecret(host.agentSecretEnc) };
}

/** Port the n-th server on a host listens on (RCON is +1, GOTV +5; the step keeps neighbours clear). */
export function portForIndex(host: Pick<ServerHost, 'portRangeStart' | 'portStep'>, index: number): number {
	return host.portRangeStart + index * host.portStep;
}

/**
 * First free slot on a host: lowest index whose game port and slug no server on the host uses.
 * Slots freed by deleting a server are reused.
 */
export function pickSlot(host: Pick<ServerHost, 'slug' | 'portRangeStart' | 'portStep' | 'maxServers'>, existing: Pick<Cs2Server, 'port' | 'slug'>[]): { index: number; port: number; slug: string } {
	const usedPorts = new Set(existing.map((s) => s.port));
	const usedSlugs = new Set(existing.map((s) => s.slug));
	for (let index = 0; index < host.maxServers; index++) {
		const port = portForIndex(host, index);
		const slug = `${host.slug}-${index + 1}`;
		if (port + 9 > MAX_GAME_PORT) break;
		if (!usedPorts.has(port) && !usedSlugs.has(slug)) return { index, port, slug };
	}
	throw new FleetError(`This host is full (${host.maxServers} servers). Raise its limit or add another host.`, 409);
}

/** True while an unfinished match holds this server. */
export async function isServerClaimed(server: Pick<Cs2Server, 'id' | 'ip' | 'port'>): Promise<boolean> {
	const row = await db.gameServer.findFirst({
		where: { match: { status: { not: 'COMPLETED' } }, OR: [{ serverId: server.id }, { serverId: null, connectIp: server.ip, port: server.port }] },
		select: { id: true },
	});
	return row !== null;
}

function asFleetError(error: unknown): FleetError {
	if (error instanceof FleetError) return error;
	if (error instanceof AgentError) return new FleetError(error.message, error.status === 404 ? 404 : error.status === 409 ? 409 : 502);
	throw error;
}

/**
 * Creates a CS2 server on a host through its agent and registers it. The agent call comes first
 * (it is the part that can fail halfway), and a failed DB insert removes the container again so
 * nothing is orphaned.
 */
export async function createManagedServer(hostId: number, input: { name?: string; region?: string; startMap?: string }): Promise<Cs2Server> {
	const host = await db.serverHost.findUnique({ where: { id: hostId }, include: { servers: { select: { port: true, slug: true } } } });
	if (!host) throw new FleetError('Host not found', 404);
	const target = agentTargetFor(host);
	const slot = pickSlot(host, host.servers);

	const spec: AgentServerSpec = {
		slug: slot.slug,
		name: input.name ?? `[Tournler] ${host.name} #${slot.index + 1}`,
		gamePort: slot.port,
		rconPort: slot.port + 1,
		tvPort: slot.port + 5,
		gamePassword: generateSecret(9),
		rconPassword: generateSecret(),
		tvPassword: generateSecret(9),
		startMap: input.startMap ?? process.env.CS2_DEFAULT_MAP ?? 'de_dust2',
	};

	try {
		await agentClient.create(target, spec);
	} catch (error) {
		throw asFleetError(error);
	}

	try {
		return await db.cs2Server.create({
			data: {
				slug: spec.slug,
				name: spec.name,
				hostId: host.id,
				ip: host.publicHost,
				port: spec.gamePort,
				rconHost: host.publicHost,
				rconPort: spec.rconPort,
				rconPasswordEnc: sealSecret(spec.rconPassword),
				region: input.region ?? host.region,
				managed: true,
				status: 'ACTIVE',
			},
		});
	} catch (error) {
		await agentClient.remove(target, spec.slug).catch(() => {});
		throw error;
	}
}

/** Removes a server: refuses while a match holds it, asks the agent to remove managed containers, then deletes the row. */
export async function removeServer(server: Cs2Server & { host: ServerHost | null }): Promise<void> {
	if (await isServerClaimed(server)) throw new FleetError('A match is using this server. Drain it and remove it once the match is over.', 409);
	if (server.managed && server.host) {
		try {
			await agentClient.remove(agentTargetFor(server.host), server.slug);
		} catch (error) {
			// 404 = the container is already gone; anything else keeps the row so nothing is orphaned.
			if (!(error instanceof AgentError && error.status === 404)) throw asFleetError(error);
		}
	}
	await db.cs2Server.delete({ where: { id: server.id } });
}

export async function powerServer(server: Cs2Server & { host: ServerHost | null }, action: PowerAction): Promise<string> {
	if (!server.managed || !server.host) throw new FleetError('Only servers created through a host agent can be started or stopped here', 409);
	if (action !== 'start' && (await isServerClaimed(server))) throw new FleetError('A match is using this server. Drain it first.', 409);
	try {
		return (await agentClient.power(agentTargetFor(server.host), server.slug, action)).state;
	} catch (error) {
		throw asFleetError(error);
	}
}

/** One-time migration of the legacy env fleet into the registry. Skips servers whose id or address is already registered. */
export async function importEnvServers(): Promise<{ imported: number; skipped: number }> {
	const env = getEnvServerPool();
	if (env.length === 0) throw new FleetError('No CS2_SERVER_POOL / CS2_SERVER_IP configured in the environment to import', 409);
	let imported = 0;
	let skipped = 0;
	for (const entry of env) {
		const slug = entry.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		const exists = await db.cs2Server.findFirst({ where: { OR: [{ slug }, { ip: entry.ip, port: entry.port }] }, select: { id: true } });
		if (exists) {
			skipped++;
			continue;
		}
		await db.cs2Server.create({
			data: {
				slug,
				name: `Server ${entry.id}`,
				ip: entry.ip,
				port: entry.port,
				rconHost: entry.rconHost,
				rconPort: entry.rconPort,
				rconPasswordEnc: sealSecret(entry.rconPassword),
			},
		});
		imported++;
	}
	return { imported, skipped };
}
