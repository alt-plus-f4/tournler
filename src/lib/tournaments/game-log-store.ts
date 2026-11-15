import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { normalizeMatchZyEvent, type GameLogEntry } from './game-log';

/**
 * Stores one MatchZy webhook payload in the match's game log. Returns false when the payload is
 * not a logged event. Callers should treat a thrown error as non-fatal: the log is a display
 * feature and must never make the score/result pipeline fail.
 */
export async function recordGameLogEvent(matchId: number, body: unknown): Promise<boolean> {
	const event = normalizeMatchZyEvent(body);
	if (!event) return false;
	await db.matchEvent.create({
		data: {
			matchId,
			mapOrder: event.mapOrder,
			round: event.round,
			roundTime: event.roundTime,
			type: event.type,
			data: event.data as Prisma.InputJsonObject,
		},
	});
	return true;
}

/** Page size for the cursor reads below. */
export const GAME_LOG_PAGE = 500;
/** How many of the newest events a first load (no cursor) returns. */
export const GAME_LOG_INITIAL = 400;

function toEntry(row: { id: number; mapOrder: number | null; round: number | null; roundTime: number | null; type: string; data: Prisma.JsonValue; createdAt: Date }): GameLogEntry {
	return { id: row.id, mapOrder: row.mapOrder, round: row.round, roundTime: row.roundTime, type: row.type, data: row.data, createdAt: row.createdAt.toISOString() } as GameLogEntry;
}

/**
 * Events of a match. With `after` (the last id the client has) it returns what is newer, oldest
 * first; without it, the newest `GAME_LOG_INITIAL` events, oldest first. `lastId` is the highest id
 * returned, or `after` when there is nothing new, so a client can always poll with it as-is.
 */
export async function readGameLog(matchId: number, after: number | null): Promise<{ events: GameLogEntry[]; lastId: number }> {
	if (after !== null) {
		const rows = await db.matchEvent.findMany({ where: { matchId, id: { gt: after } }, orderBy: { id: 'asc' }, take: GAME_LOG_PAGE });
		return { events: rows.map(toEntry), lastId: rows.length ? rows[rows.length - 1].id : after };
	}
	const rows = await db.matchEvent.findMany({ where: { matchId }, orderBy: { id: 'desc' }, take: GAME_LOG_INITIAL });
	rows.reverse();
	return { events: rows.map(toEntry), lastId: rows.length ? rows[rows.length - 1].id : 0 };
}
