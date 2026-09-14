import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { MatchSlot } from '@prisma/client';

const MAX_NAME_LENGTH = 30;

/**
 * PATCH /api/matches/[matchId]/team-name
 * Renames one side's display label in a pickup match's lobby (defaults to "Side A"/"Side B"
 * otherwise). Only that side's captain — the first player to join it, per `MatchParticipant`'s
 * `joinedAt` — may rename it, and only before the match starts.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const body = await request.json().catch(() => null);
		const side = body?.side;
		const nameRaw = body?.name;
		if (side !== 'TEAM_A' && side !== 'TEAM_B') {
			return NextResponse.json({ error: 'side must be TEAM_A or TEAM_B' }, { status: 400 });
		}
		if (typeof nameRaw !== 'string') {
			return NextResponse.json({ error: 'name is required' }, { status: 400 });
		}
		const name = nameRaw.trim();
		if (name.length === 0) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
		if (name.length > MAX_NAME_LENGTH) {
			return NextResponse.json({ error: `name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
		}

		const match = await db.matches.findUnique({ where: { id: parsedMatchId }, select: { isPickup: true, status: true } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		if (!match.isPickup) return NextResponse.json({ error: 'This match is not an open pickup match' }, { status: 400 });
		if (match.status !== 'SCHEDULED') {
			return NextResponse.json({ error: 'The lobby name can only be changed before the match starts' }, { status: 409 });
		}

		const captain = await db.matchParticipant.findFirst({
			where: { matchId: parsedMatchId, side: side as MatchSlot },
			orderBy: { joinedAt: 'asc' },
		});
		if (!captain) return NextResponse.json({ error: 'That side has no players yet' }, { status: 400 });
		if (captain.userId !== session.user.id) {
			return NextResponse.json({ error: "Only that side's captain (the first player to join) can rename it" }, { status: 403 });
		}

		const updated = await db.matches.update({
			where: { id: parsedMatchId },
			data: side === 'TEAM_A' ? { teamAName: name } : { teamBName: name },
			select: { teamAName: true, teamBName: true },
		});

		return NextResponse.json(updated);
	} catch (error) {
		console.error('Error renaming match side:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
