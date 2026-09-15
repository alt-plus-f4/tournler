import { randomBytes } from 'crypto';
import { GameServer, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerPool } from '@/lib/cs2/server-pool';

type Db = Prisma.TransactionClient | typeof db;

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
 * deployment runs a fixed-size pool of real, persistent CS2 servers (see `cs-docker/` and
 * `src/lib/cs2/server-pool.ts`), not one container per match: this picks whichever pool slot
 * isn't currently claimed by another LIVE/PAUSED match, throwing `NoAvailableGameServerError` if
 * the whole pool is busy. `password` is generated here and pushed to the real server over RCON
 * by `pushMatchConfigToServer` (see `src/lib/cs2/provisioning.ts`), called by the same callers
 * right after this.
 */
export async function ensureGameServer(tx: Db, matchId: number): Promise<{ gameServer: GameServer; created: boolean }> {
	const existing = await tx.gameServer.findUnique({ where: { matchId } });
	if (existing) return { gameServer: existing, created: false };

	const pool = getServerPool();
	if (pool.length === 0) {
		throw new Error('No CS2 servers configured — set CS2_SERVER_POOL, or CS2_SERVER_IP/CS2_SERVER_PORT/CS2_RCON_PASSWORD for a single server');
	}

	// Not just LIVE/PAUSED: a SCHEDULED match that was already pre-warmed (see prewarmUpcomingMatches
	// — loaded onto a server early, ahead of its official start) already has a GameServer row too
	// and must count as claiming that slot, or a second match could be allocated the same server.
	const claimed = await tx.gameServer.findMany({
		where: { match: { status: { not: 'COMPLETED' } } },
		select: { connectIp: true, port: true },
	});
	const claimedKeys = new Set(claimed.map((g) => `${g.connectIp}:${g.port}`));
	const freeSlot = pool.find((s) => !claimedKeys.has(`${s.ip}:${s.port}`));

	if (!freeSlot) {
		throw new NoAvailableGameServerError(`All ${pool.length} CS2 server(s) in the pool are currently in use`);
	}

	const password = randomBytes(9).toString('base64url');

	const gameServer = await tx.gameServer.create({
		data: { matchId, connectIp: freeSlot.ip, port: freeSlot.port, password, status: 'RUNNING' },
	});

	return { gameServer, created: true };
}
