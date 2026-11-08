import type { Cs2Server, Cs2ServerStatus } from '@prisma/client';
import { db, type DbTx } from '@/lib/db';
import { openSecret } from './secret-box';

export interface Cs2ServerConfig {
	/** Slug used in URLs and admin screens ("01", "eu-1-a"). */
	id: string;
	ip: string;
	port: number;
	rconHost: string;
	rconPort: number;
	rconPassword: string;
	/** Registry row id; absent for entries read from the legacy env config. */
	dbId?: number;
	name?: string;
	status?: Cs2ServerStatus;
	region?: string;
	hostId?: number | null;
	managed?: boolean;
	lastHealthy?: boolean | null;
	lastSeenAt?: Date | null;
	lastError?: string | null;
}

type Client = typeof db | DbTx;

/** How long a failed health check keeps a server out of allocation before it is tried again. */
export const UNHEALTHY_RETRY_MS = 10 * 60_000;

interface RawPoolEntry {
	id: string;
	ip: string;
	port: number;
	rconHost?: string;
	rconPort?: number;
	rconPassword: string;
}

/**
 * The legacy, env-only fleet: `CS2_SERVER_POOL` (a JSON array), or a single server from the older
 * `CS2_SERVER_IP`/`CS2_SERVER_PORT`/`CS2_RCON_HOST`/`CS2_RCON_PORT`/`CS2_RCON_PASSWORD` vars.
 * Only used when the registry table is empty, so existing deployments keep working until an
 * admin imports it (Admin → Servers → "Import from env").
 */
export function getEnvServerPool(): Cs2ServerConfig[] {
	const raw = process.env.CS2_SERVER_POOL;
	if (raw) {
		let parsed: RawPoolEntry[];
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error('CS2_SERVER_POOL is not valid JSON');
		}
		return parsed.map((entry) => ({
			id: entry.id,
			ip: entry.ip,
			port: entry.port,
			rconHost: entry.rconHost ?? entry.ip,
			rconPort: entry.rconPort ?? entry.port + 1,
			rconPassword: entry.rconPassword,
		}));
	}

	const ip = process.env.CS2_SERVER_IP || process.env.GAME_SERVER_IP || 'localhost';
	const port = Number.parseInt(process.env.CS2_SERVER_PORT || '27015', 10);
	const rconHost = process.env.CS2_RCON_HOST || ip;
	const rconPort = Number.parseInt(process.env.CS2_RCON_PORT || '27016', 10);
	const rconPassword = process.env.CS2_RCON_PASSWORD;
	if (!rconPassword) return [];

	return [{ id: 'default', ip, port, rconHost, rconPort, rconPassword }];
}

export function rowToConfig(row: Cs2Server): Cs2ServerConfig {
	return {
		id: row.slug,
		dbId: row.id,
		name: row.name,
		ip: row.ip,
		port: row.port,
		rconHost: row.rconHost,
		rconPort: row.rconPort,
		rconPassword: openSecret(row.rconPasswordEnc),
		status: row.status,
		region: row.region,
		hostId: row.hostId,
		managed: row.managed,
		lastHealthy: row.lastHealthy,
		lastSeenAt: row.lastSeenAt,
		lastError: row.lastError,
	};
}

/**
 * Every server this deployment knows about, whatever its status: the registry table, or the
 * legacy env config while the table is still empty. Throws if a stored secret can't be opened
 * (wrong/missing `SERVER_SECRET_KEY`) or the env fallback is malformed; admin callers report
 * that as "misconfigured" rather than crashing.
 */
export async function getServerPool(client: Client = db): Promise<Cs2ServerConfig[]> {
	const rows = await client.cs2Server.findMany({ orderBy: { id: 'asc' } });
	if (rows.length > 0) return rows.map(rowToConfig);
	return getEnvServerPool();
}

/**
 * The servers a new match may be put on. Disabled/draining servers and ones whose last health
 * check failed are skipped; servers never checked yet (`lastHealthy` null) stay eligible, and
 * known-healthy ones are preferred. `configured` is how many servers exist at all, so callers can
 * tell "nothing set up" from "everything busy or switched off".
 */
export async function getAllocatableServers(client: Client): Promise<{ configured: number; servers: Cs2ServerConfig[] }> {
	const rows = await client.cs2Server.findMany({ orderBy: { id: 'asc' } });
	if (rows.length === 0) {
		const env = getEnvServerPool();
		return { configured: env.length, servers: env };
	}
	const now = Date.now();
	// A failed check only keeps a server out for a while: the flag can go stale when checks run
	// rarely (a daily cron), and a server that recovered must not stay locked out until the next one.
	const failedRecently = (r: Cs2Server) => r.lastHealthy === false && Boolean(r.updatedAt) && now - r.updatedAt.getTime() < UNHEALTHY_RETRY_MS;
	const eligible = rows.filter((r) => r.status === 'ACTIVE' && !failedRecently(r) && (r.lastHealthy !== false || Boolean(r.updatedAt)));
	eligible.sort((a, b) => Number(b.lastHealthy === true) - Number(a.lastHealthy === true));
	return { configured: rows.length, servers: eligible.map(rowToConfig) };
}

/** Finds the server whose public address matches a legacy `GameServer` row's `connectIp`/`port`. */
export async function findServerByConnect(ip: string, port: number): Promise<Cs2ServerConfig | undefined> {
	return (await getServerPool()).find((s) => s.ip === ip && s.port === port);
}

/** Resolves the server a `GameServer` row belongs to: by registry id when it has one, else by address. */
export async function resolveGameServerTarget(gameServer: { serverId: number | null; connectIp: string; port: number }): Promise<Cs2ServerConfig | undefined> {
	if (gameServer.serverId != null) {
		const row = await db.cs2Server.findUnique({ where: { id: gameServer.serverId } });
		if (row) return rowToConfig(row);
	}
	return findServerByConnect(gameServer.connectIp, gameServer.port);
}

/** Persists the outcome of a health probe so the allocator can skip servers that are down. */
export async function recordServerHealth(dbId: number | undefined, result: { healthy: boolean; error?: string | null }): Promise<void> {
	if (dbId == null) return;
	await db.cs2Server
		.update({
			where: { id: dbId },
			data: { lastHealthy: result.healthy, lastError: result.healthy ? null : (result.error ?? 'unreachable').slice(0, 200), lastSeenAt: result.healthy ? new Date() : undefined },
		})
		.catch(() => {});
}
