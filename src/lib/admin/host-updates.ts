import 'server-only';
import { db } from '@/lib/db';
import { agentClient, AgentError, type AgentHealth } from '@/lib/cs2/agent-client';
import { agentTargetFor, FleetError } from '@/lib/cs2/fleet';

/**
 * Rolling CS2 update for one host: drain its servers, wait for running matches to end, stop the
 * containers, update the shared game files through the agent, start the servers again.
 *
 * Invariant: while `ServerHost.updateRequestedAt` is set, every DRAINING server on that host is
 * "drained by the update". Servers an admin had DISABLED are never touched and stay DISABLED; when
 * the update finishes or is cancelled, the host's DRAINING servers go back to ACTIVE. (A server an
 * admin drained by hand just before requesting the update is returned to ACTIVE as well.)
 */

export class HostUpdateError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = 'HostUpdateError';
	}
}

export type HostUpdateStep = { state: 'idle' } | { state: 'waiting'; busy: number } | { state: 'updating' } | { state: 'updated'; startFailures: string[] } | { state: 'error'; error: string };

export type HostUpdateState = { requestedAt: Date | null; state: 'idle' | 'waiting' | 'updating'; busyServers: number };

const ADVANCE_LOCK_NAMESPACE = 727002;

/**
 * Servers on the host that still have an unfinished match. Same rule as the pool allocator
 * (src/lib/tournaments/game-server.ts): any `GameServer` whose match is not COMPLETED claims its
 * server, including pre-warmed SCHEDULED ones. Legacy rows without `serverId` match by address.
 */
async function countBusyServers(hostId: number): Promise<number> {
	const servers = await db.cs2Server.findMany({ where: { hostId }, select: { id: true, ip: true, port: true } });
	if (servers.length === 0) return 0;
	const claimed = await db.gameServer.findMany({ where: { match: { status: { not: 'COMPLETED' } } }, select: { serverId: true, connectIp: true, port: true } });
	const claimedIds = new Set(claimed.flatMap((g) => (g.serverId == null ? [] : [g.serverId])));
	const claimedKeys = new Set(claimed.map((g) => `${g.connectIp}:${g.port}`));
	return servers.filter((s) => claimedIds.has(s.id) || claimedKeys.has(`${s.ip}:${s.port}`)).length;
}

async function loadHost(hostId: number) {
	const host = await db.serverHost.findUnique({ where: { id: hostId } });
	if (!host) throw new HostUpdateError('Host not found', 404);
	return host;
}

/** Drains the host's ACTIVE servers and starts the update; it runs as soon as no match is in progress. */
export async function requestHostUpdate(hostId: number): Promise<HostUpdateStep> {
	const host = await loadHost(hostId);
	if (!host.agentUrl || !host.agentSecretEnc) throw new HostUpdateError('This host has no agent configured', 409);

	await db.$transaction(async (tx) => {
		if (!host.updateRequestedAt) await tx.serverHost.update({ where: { id: hostId }, data: { updateRequestedAt: new Date() } });
		await tx.cs2Server.updateMany({ where: { hostId, status: 'ACTIVE' }, data: { status: 'DRAINING' } });
	});
	// Asking again while one is pending retries a failed update.
	return advanceHostUpdate(hostId, { retry: Boolean(host.updateRequestedAt) });
}

/** Abandons a pending update and returns the drained servers to ACTIVE. Containers the update already stopped are started again. */
export async function cancelHostUpdate(hostId: number): Promise<void> {
	const host = await loadHost(hostId);
	if (!host.updateRequestedAt) return;
	const drained = await db.cs2Server.findMany({ where: { hostId, status: 'DRAINING' }, select: { slug: true, managed: true } });
	await db.$transaction([
		db.serverHost.update({ where: { id: hostId }, data: { updateRequestedAt: null } }),
		db.cs2Server.updateMany({ where: { hostId, status: 'DRAINING' }, data: { status: 'ACTIVE' } }),
	]);
	if (!host.agentUrl || !host.agentSecretEnc) return;
	// Best effort: if the agent is mid-update it refuses; the servers then come back with the next manual start.
	const target = agentTargetFor(host);
	for (const s of drained) {
		if (!s.managed) continue;
		await agentClient.power(target, s.slug, 'start').catch(() => {});
	}
}

/** Cheap, DB-only reading for the admin UI. `updating` covers both "stopping/installing" and "restarting". */
export async function getHostUpdateState(hostId: number): Promise<HostUpdateState> {
	const host = await db.serverHost.findUnique({ where: { id: hostId }, select: { updateRequestedAt: true } });
	if (!host?.updateRequestedAt) return { requestedAt: null, state: 'idle', busyServers: 0 };
	const busyServers = await countBusyServers(hostId);
	return { requestedAt: host.updateRequestedAt, state: busyServers > 0 ? 'waiting' : 'updating', busyServers };
}

function describe(error: unknown): string {
	if (error instanceof AgentError || error instanceof FleetError || error instanceof Error) return error.message;
	return 'unknown error';
}

/**
 * One idempotent step of the update. Safe to call repeatedly and concurrently: a Postgres advisory
 * lock (per host) lets only one caller act, the others return the current state without doing anything.
 *
 * - no update requested: `idle`
 * - a match is still running on the host: `waiting`
 * - idle: stops the host's running containers and starts the agent's (background) base update: `updating`
 * - agent still installing: `updating`
 * - agent finished an update after the request: starts the servers, returns them to ACTIVE, clears the request: `updated`
 * - agent unreachable, or the install failed: `error`. The request stays set so it can be retried
 *   (`retry: true`, or request again) or cancelled; it never leaves the servers drained with no way out.
 */
export async function advanceHostUpdate(hostId: number, opts: { retry?: boolean } = {}): Promise<HostUpdateStep> {
	return db.$transaction(
		async (tx) => {
			const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${ADVANCE_LOCK_NAMESPACE}, ${hostId}) AS locked`;
			const host = await tx.serverHost.findUnique({ where: { id: hostId } });
			if (!host?.updateRequestedAt) return { state: 'idle' } as const;
			if (!locked) return { state: 'updating' } as const; // another caller is acting right now

			const requestedAt = host.updateRequestedAt;
			if (!host.agentUrl || !host.agentSecretEnc) return { state: 'error', error: 'This host has no agent configured' } as const;

			const busy = await countBusyServers(hostId);
			if (busy > 0) return { state: 'waiting', busy } as const;

			try {
				const target = agentTargetFor(host);
				const health: AgentHealth = await agentClient.health(target);
				const update = health.baseUpdate;

				if (update.state === 'running') return { state: 'updating' } as const;

				if (update.state === 'failed' && !opts.retry) return { state: 'error', error: update.error ?? 'The game file update failed' } as const;

				// The agent reports when its last successful update finished; one after our request is ours.
				if (update.state === 'idle' && update.finishedAt && new Date(update.finishedAt) >= requestedAt) {
					const drained = await tx.cs2Server.findMany({ where: { hostId, status: 'DRAINING' }, select: { slug: true, managed: true } });
					const startFailures: string[] = [];
					for (const s of drained) {
						if (!s.managed) continue;
						try {
							await agentClient.power(target, s.slug, 'start');
						} catch {
							startFailures.push(s.slug);
						}
					}
					await tx.cs2Server.updateMany({ where: { hostId, status: 'DRAINING' }, data: { status: 'ACTIVE' } });
					await tx.serverHost.update({ where: { id: hostId }, data: { updateRequestedAt: null } });
					return { state: 'updated', startFailures } as const;
				}

				// Not started yet (or retrying): the agent refuses to update under a running container.
				const { servers } = await agentClient.list(target);
				for (const s of servers) if (s.state === 'running') await agentClient.power(target, s.slug, 'stop');
				await agentClient.updateBase(target);
				return { state: 'updating' } as const;
			} catch (error) {
				return { state: 'error', error: describe(error) } as const;
			}
		},
		{ timeout: 300_000, maxWait: 10_000 },
	);
}
