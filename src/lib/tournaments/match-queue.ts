import { after } from 'next/server';
import { db } from '@/lib/db';
import { advanceHostUpdate } from '@/lib/admin/host-updates';
import { MatchLifecycleError, startMatch } from './bracket-advancement';

/**
 * Match queue for a full server pool.
 *
 * Starting a match when every server is busy used to be rejected, leaving an admin to retry by
 * hand. Now `startMatch()` stamps `Matches.queuedAt` (status stays SCHEDULED) and this module
 * starts the oldest queued match whenever a server frees up. Queue order is simply `queuedAt`
 * ascending, so there is no separate queue table to keep in sync.
 *
 * Callers that free a server (a match completing, the cron safety net, a host finishing an
 * update) call `startQueuedMatches()`; it is safe to call at any time and concurrently — each
 * start goes through `ensureGameServer`'s advisory lock, so two callers can't claim one server.
 */

/** 1-based position in the queue, or null if the match is not queued. */
export async function getQueuePosition(matchId: number): Promise<number | null> {
	const match = await db.matches.findUnique({ where: { id: matchId }, select: { queuedAt: true, status: true } });
	if (!match?.queuedAt || match.status !== 'SCHEDULED') return null;
	const ahead = await db.matches.count({ where: { status: 'SCHEDULED', queuedAt: { not: null, lt: match.queuedAt } } });
	return ahead + 1;
}

/** Removes a match from the queue (it stays SCHEDULED). Returns false if it was not queued. */
export async function dequeueMatch(matchId: number): Promise<boolean> {
	const { count } = await db.matches.updateMany({ where: { id: matchId, queuedAt: { not: null } }, data: { queuedAt: null } });
	return count > 0;
}

/** Moves a queued match to the front of the queue. Returns false if it was not queued. */
export async function prioritizeQueuedMatch(matchId: number): Promise<boolean> {
	const first = await db.matches.findFirst({ where: { status: 'SCHEDULED', queuedAt: { not: null } }, orderBy: { queuedAt: 'asc' }, select: { id: true, queuedAt: true } });
	if (!first?.queuedAt) return false;
	if (first.id === matchId) return true;
	const { count } = await db.matches.updateMany({
		where: { id: matchId, status: 'SCHEDULED', queuedAt: { not: null } },
		data: { queuedAt: new Date(first.queuedAt.getTime() - 1) },
	});
	return count > 0;
}

/** Number of matches currently waiting for a server. */
export async function getQueueLength(): Promise<number> {
	return db.matches.count({ where: { status: 'SCHEDULED', queuedAt: { not: null } } });
}

/**
 * Starts queued matches oldest-first until the pool is full again. Returns the ids it started.
 * A queued match that can no longer start (veto undone, a slot emptied, not scheduled any more)
 * is dropped from the queue rather than blocking the ones behind it.
 */
export async function startQueuedMatches(): Promise<number[]> {
	const started: number[] = [];
	// Bounded: a pool never has more free servers than this, and the loop stops at the first
	// match that re-queues (= no server free).
	for (let i = 0; i < 20; i++) {
		const next = await db.matches.findFirst({ where: { status: 'SCHEDULED', queuedAt: { not: null } }, orderBy: { queuedAt: 'asc' }, select: { id: true } });
		if (!next) break;
		try {
			const result = await startMatch(next.id);
			if (result.queued) break; // still no free server
			started.push(next.id);
		} catch (error) {
			if (!(error instanceof MatchLifecycleError)) {
				console.error(`Failed to start queued match ${next.id}:`, error);
			}
			await dequeueMatch(next.id);
		}
	}
	return started;
}

/**
 * Called after a match completed and its server was released, once the response has gone out (each
 * step can push to a real server over RCON or call a host agent, which must not delay a webhook
 * response). First lets a pending "update CS2 when idle" on that server's host move on (the
 * server just stopped being busy), then starts the oldest queued match on whatever is free.
 * Outside a request scope — e.g. a script — `after()` throws, so it just runs inline instead.
 */
export function onServerReleased(matchId: number) {
	const run = async () => {
		try {
			const row = await db.gameServer.findUnique({ where: { matchId }, select: { server: { select: { hostId: true } } } });
			const hostId = row?.server?.hostId;
			if (hostId != null) await advanceHostUpdate(hostId);
		} catch (error) {
			console.error(`Failed to advance the host update after match ${matchId}:`, error);
		}
		await startQueuedMatches().catch((error) => console.error('Failed to start queued matches:', error));
	};
	try {
		after(run);
	} catch {
		void run();
	}
}
