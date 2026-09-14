import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { MatchSlot } from '@prisma/client';

const SLOTS_PER_SIDE = 5;

const PARTICIPANT_INCLUDE = { user: { select: { id: true, name: true, image: true } } } as const;

/** POST /api/matches/[matchId]/join — any signed-in user joins a side of an open pickup match. */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const body = await request.json();
		const { side } = body;
		if (side !== 'TEAM_A' && side !== 'TEAM_B') {
			return NextResponse.json({ error: 'side must be TEAM_A or TEAM_B' }, { status: 400 });
		}

		const match = await db.matches.findUnique({ where: { id: parsedMatchId }, select: { isPickup: true, status: true } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		if (!match.isPickup) return NextResponse.json({ error: 'This match is not an open pickup match' }, { status: 400 });
		if (match.status !== 'SCHEDULED') return NextResponse.json({ error: 'This match can no longer be joined' }, { status: 409 });

		const existing = await db.matchParticipant.findUnique({ where: { matchId_userId: { matchId: parsedMatchId, userId: session.user.id } } });
		if (!existing || existing.side !== side) {
			const sideCount = await db.matchParticipant.count({ where: { matchId: parsedMatchId, side: side as MatchSlot, userId: { not: session.user.id } } });
			if (sideCount >= SLOTS_PER_SIDE) {
				return NextResponse.json({ error: 'That side is full' }, { status: 409 });
			}
		}

		await db.matchParticipant.upsert({
			where: { matchId_userId: { matchId: parsedMatchId, userId: session.user.id } },
			create: { matchId: parsedMatchId, userId: session.user.id, side: side as MatchSlot },
			update: { side: side as MatchSlot },
		});

		const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
		return NextResponse.json({ participants });
	} catch (error) {
		console.error('Error joining match:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** DELETE /api/matches/[matchId]/join — leave a pickup match (removes the caller's own slot). */
export async function DELETE(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		await db.matchParticipant.deleteMany({ where: { matchId: parsedMatchId, userId: session.user.id } });

		const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
		return NextResponse.json({ participants });
	} catch (error) {
		console.error('Error leaving match:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
