import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchHeadToHead } from '@/lib/helpers/head-to-head';

/**
 * GET /api/matches/[matchId]/head-to-head
 * Public — the match page is spectator-visible, and this is derived from already-public results.
 * { headToHead: null } for pickups or matches where either side isn't a real team yet.
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	const { matchId } = await params;
	const parsedMatchId = Number.parseInt(matchId, 10);
	if (Number.isNaN(parsedMatchId)) {
		return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
	}

	const match = await db.matches.findUnique({ where: { id: parsedMatchId }, select: { teamAId: true, teamBId: true, isPickup: true } });
	if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

	if (match.isPickup || match.teamAId === null || match.teamBId === null) {
		return NextResponse.json({ headToHead: null });
	}

	const headToHead = await fetchHeadToHead(match.teamAId, match.teamBId, parsedMatchId);
	return NextResponse.json({ headToHead });
}
