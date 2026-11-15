import type { DbTx } from '@/lib/db';
import { randomBytes } from 'crypto';
import { GameServer } from '@prisma/client';
import { db } from '@/lib/db';
import { getAllocatableServers } from '@/lib/cs2/server-pool';
import { assertMatchHostsGameServer } from './game-rules';

type Db = DbTx | typeof db;

/** Thrown by `ensureGameServer` when every server in the pool is currently claimed by a live/paused match. */
export class NoAvailableGameServerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NoAvailableGameServerError';
	}
}

/**
 * Creates (or reuses, if one already exists) the `GameServer` row for a match — the single
 * write path shared by the manual "create game server" route and `startMatch()`. This
 * deployment runs a fleet of real, persistent CS2 servers kept in the `Cs2Server` table (see
 * `cs-docker/` and `src/lib/cs2/server-pool.ts`), not one container per match: this picks an
 * active, healthy server that isn't claimed by another unfinished match, throwing
 * `NoAvailableGameServerError` if none is free. `password` is generated here and pushed to the real server over RCON
 * by `pushMatchConfigToServer` (see `src/lib/cs2/provisioning.ts`), called by the same callers
 * right after this.
 */
export async function ensureGameServer(tx: Db, matchId: number): Promise<{ gameServer: GameServer; created: boolean }> {
	// The slot pick below is read-then-insert, so it must run in a transaction holding the pool lock;
	// callers passing the bare client (prewarm cron, manual route) get one made for them.
	if ('$transaction' in tx) {
		return tx.$transaction((inner) => ensureGameServerLocked(inner, matchId));
	}
	return ensureGameServerLocked(tx, matchId);
}

const POOL_ALLOCATION_LOCK_KEY = 727001;

async function ensureGameServerLocked(tx: DbTx, matchId: number): Promise<{ gameServer: GameServer; created: boolean }> {
	// Serialises slot allocation across concurrent starts (admin Start racing the prewarm cron),
	// released automatically at commit.
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(${POOL_ALLOCATION_LOCK_KEY})`;

	// Never claim a CS2 pool slot for a game Tournler doesn't host (LoL): throws HostedServerUnsupportedError.
	await assertMatchHostsGameServer(tx, matchId, 'provision');

	const existing = await tx.gameServer.findUnique({ where: { matchId } });
	if (existing) return { gameServer: existing, created: false };

	const { configured, servers } = await getAllocatableServers(tx);
	if (configured === 0) {
		throw new Error('No CS2 servers configured — add one under Admin → Servers (or set CS2_SERVER_POOL / CS2_SERVER_IP for the legacy env setup)');
	}

	// Not just LIVE/PAUSED: a SCHEDULED match that was already pre-warmed (see prewarmUpcomingMatches
	// — loaded onto a server early, ahead of its official start) already has a GameServer row too
	// and must count as claiming that slot, or a second match could be allocated the same server.
	// Rows from before the registry have no serverId, so the address is checked as well.
	const claimed = await tx.gameServer.findMany({
		where: { match: { status: { not: 'COMPLETED' } } },
		select: { serverId: true, connectIp: true, port: true },
	});
	const claimedIds = new Set(claimed.flatMap((g) => (g.serverId == null ? [] : [g.serverId])));
	const claimedKeys = new Set(claimed.map((g) => `${g.connectIp}:${g.port}`));
	const freeSlot = servers.find((s) => !(s.dbId != null && claimedIds.has(s.dbId)) && !claimedKeys.has(`${s.ip}:${s.port}`));

	if (!freeSlot) {
		throw new NoAvailableGameServerError(
			servers.length === 0
				? `None of the ${configured} CS2 server(s) can take a match right now (disabled, draining or failing health checks).`
				: `All ${servers.length} available CS2 server(s) are currently in use — wait for one to free up and try again.`,
		);
	}

	const password = randomBytes(9).toString('base64url');

	const gameServer = await tx.gameServer.create({
		data: { matchId, serverId: freeSlot.dbId ?? null, connectIp: freeSlot.ip, port: freeSlot.port, password, status: 'RUNNING' },
	});

	return { gameServer, created: true };
}
