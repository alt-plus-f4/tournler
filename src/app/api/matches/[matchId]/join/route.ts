import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { MatchSlot } from '@prisma/client';
import { DRAFT_POOL_SIZE } from '@/lib/tournaments/draft';

const SLOTS_PER_SIDE = 5;
// 2 captains + the pool — see draft.ts's DRAFT_POOL_SIZE for why it's 8, not a generic cap.
const DRAFT_LOBBY_SIZE = 2 + DRAFT_POOL_SIZE;

const PARTICIPANT_INCLUDE = { user: { select: { id: true, name: true, image: true } } } as const;

/**
 * POST /api/matches/[matchId]/join — joins a pickup match. Two different join flows depending on
 * `PickupMode` (see draft.ts's doc comment for the CAPTAIN_DRAFT flow):
 *  - OPEN (default): caller picks `side` (TEAM_A/TEAM_B) directly, same as always.
 *  - CAPTAIN_DRAFT: no `side` — the first 2 joiners become the two captains (side TEAM_A/TEAM_B,
 *    isCaptain true) automatically, everyone after that joins a shared pool (side POOL) until the
 *    captains draft them (see /api/matches/[matchId]/draft).
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const match = await db.matches.findUnique({ where: { id: parsedMatchId }, select: { isPickup: true, pickupMode: true, status: true } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		if (!match.isPickup) return NextResponse.json({ error: 'This match is not an open pickup match' }, { status: 400 });
		if (match.status !== 'SCHEDULED') return NextResponse.json({ error: 'This match can no longer be joined' }, { status: 409 });

		if (match.pickupMode === 'CAPTAIN_DRAFT') {
			const existing = await db.matchParticipant.findUnique({ where: { matchId_userId: { matchId: parsedMatchId, userId: session.user.id } } });
			if (existing) {
				const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
				return NextResponse.json({ participants });
			}

			const count = await db.matchParticipant.count({ where: { matchId: parsedMatchId } });
			if (count >= DRAFT_LOBBY_SIZE) return NextResponse.json({ error: 'This draft lobby is full' }, { status: 409 });

			const side: MatchSlot = count === 0 ? 'TEAM_A' : count === 1 ? 'TEAM_B' : 'POOL';
			const isCaptain = count < 2;

			await db.matchParticipant.create({ data: { matchId: parsedMatchId, userId: session.user.id, side, isCaptain } });

			const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
			return NextResponse.json({ participants });
		}

		const body = await request.json();
		const { side } = body;
		if (side !== 'TEAM_A' && side !== 'TEAM_B') {
			return NextResponse.json({ error: 'side must be TEAM_A or TEAM_B' }, { status: 400 });
		}

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
