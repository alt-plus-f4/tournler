import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { MatchSlot } from '@prisma/client';
import { type DbTx } from '@/lib/db';
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

		// MatchZy whitelists by SteamID64, so someone without a linked Steam account would be kicked
		// from the server the moment they connect.
		const linkedSteam = await db.user.findUnique({ where: { id: session.user.id }, select: { steam: { select: { steamId: true } } } });
		if (!linkedSteam?.steam) {
			return NextResponse.json({ error: 'Link your Steam account in your profile settings before joining a match' }, { status: 409 });
		}

		let requestedSide: MatchSlot | null = null;
		if (match.pickupMode !== 'CAPTAIN_DRAFT') {
			const body = await request.json().catch(() => null);
			const side = body?.side;
			if (side !== 'TEAM_A' && side !== 'TEAM_B') {
				return NextResponse.json({ error: 'side must be TEAM_A or TEAM_B' }, { status: 400 });
			}
			requestedSide = side;
		}

		await db.$transaction(async (tx) => {
			await lockPickup(tx, parsedMatchId);

			const fresh = await tx.matches.findUnique({ where: { id: parsedMatchId }, select: { status: true } });
			if (fresh?.status !== 'SCHEDULED') throw new JoinError('This match can no longer be joined', 409);

			const current = await tx.matchParticipant.findMany({ where: { matchId: parsedMatchId } });
			const existing = current.find((p) => p.userId === session.user.id);

			if (match.pickupMode === 'CAPTAIN_DRAFT') {
				if (existing) return;
				if (current.length >= DRAFT_LOBBY_SIZE) throw new JoinError('This draft lobby is full', 409);

				// Derived from who holds each captain seat, not from how many people joined, so a
				// captain leaving and someone else joining can never leave a side without a captain.
				const hasCaptainA = current.some((p) => p.isCaptain && p.side === 'TEAM_A');
				const hasCaptainB = current.some((p) => p.isCaptain && p.side === 'TEAM_B');
				const side: MatchSlot = !hasCaptainA ? 'TEAM_A' : !hasCaptainB ? 'TEAM_B' : 'POOL';
				await tx.matchParticipant.create({ data: { matchId: parsedMatchId, userId: session.user.id, side, isCaptain: side !== 'POOL' } });
				return;
			}

			const side = requestedSide as MatchSlot;
			if (!existing || existing.side !== side) {
				const sideCount = current.filter((p) => p.side === side && p.userId !== session.user.id).length;
				if (sideCount >= SLOTS_PER_SIDE) throw new JoinError('That side is full', 409);
			}
			await tx.matchParticipant.upsert({
				where: { matchId_userId: { matchId: parsedMatchId, userId: session.user.id } },
				create: { matchId: parsedMatchId, userId: session.user.id, side },
				update: { side },
			});
		});

		const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
		return NextResponse.json({ participants });
	} catch (error) {
		if (error instanceof JoinError) return NextResponse.json({ error: error.message }, { status: error.status });
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

		await db.$transaction(async (tx) => {
			await lockPickup(tx, parsedMatchId);

			const match = await tx.matches.findUnique({ where: { id: parsedMatchId }, select: { isPickup: true, pickupMode: true, status: true } });
			if (!match?.isPickup) throw new JoinError('Match not found', 404);
			if (match.status !== 'SCHEDULED') throw new JoinError('This match has already started and can no longer be left', 409);

			const me = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId: parsedMatchId, userId: session.user.id } } });
			if (!me) return;

			if (match.pickupMode === 'CAPTAIN_DRAFT') {
				if ((await tx.matchDraftPick.count({ where: { matchId: parsedMatchId } })) > 0) {
					throw new JoinError('The draft has already started — you can no longer leave', 409);
				}
				await tx.matchParticipant.delete({ where: { id: me.id } });
				if (me.isCaptain) {
					// Hand the vacated captain seat to whoever has been waiting in the pool longest.
					const next = await tx.matchParticipant.findFirst({ where: { matchId: parsedMatchId, side: 'POOL' }, orderBy: { joinedAt: 'asc' } });
					if (next) await tx.matchParticipant.update({ where: { id: next.id }, data: { side: me.side, isCaptain: true } });
				}
				return;
			}

			await tx.matchParticipant.delete({ where: { id: me.id } });
		});

		const participants = await db.matchParticipant.findMany({ where: { matchId: parsedMatchId }, include: PARTICIPANT_INCLUDE, orderBy: { joinedAt: 'asc' } });
		return NextResponse.json({ participants });
	} catch (error) {
		if (error instanceof JoinError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error('Error leaving match:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

class JoinError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

/** Serialises joins/leaves for one pickup so roster counts and captain seats can't be raced. */
async function lockPickup(tx: DbTx, matchId: number) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(727002, ${matchId}::int)`;
}
