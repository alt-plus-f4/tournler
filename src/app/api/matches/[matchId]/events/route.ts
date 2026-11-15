import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readGameLog } from '@/lib/tournaments/game-log-store';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/matches/[matchId]/events?after=<id>
 *
 * Public live game log (kills, bomb events, round results) of a match, as stored from the game
 * server's MatchZy webhook. Without `after` it returns the newest events; with it, only events
 * newer than that id, so a client polls cheaply with the `lastId` it got last time. Shows nothing
 * a visitor can't already see on the public match page (no SteamIDs are stored).
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const matchId = Number.parseInt((await params).matchId, 10);
		if (!Number.isInteger(matchId) || matchId <= 0) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400, headers: noStore });

		const afterParam = new URL(request.url).searchParams.get('after');
		let after: number | null = null;
		if (afterParam !== null) {
			after = Number.parseInt(afterParam, 10);
			if (!Number.isInteger(after) || after < 0) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400, headers: noStore });
		}

		const match = await db.matches.findUnique({ where: { id: matchId }, select: { id: true } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404, headers: noStore });

		return NextResponse.json(await readGameLog(matchId, after), { headers: noStore });
	} catch (error) {
		console.error('Error fetching game log:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
