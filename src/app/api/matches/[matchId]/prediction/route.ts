import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

type Params = { params: Promise<{ matchId: string }> };

const pickSchema = z.object({ teamId: z.number().int().positive() });

/**
 * GET /api/matches/:matchId/prediction — public. `{ enabled, locked, pick, counts }`; `pick` is the
 *   signed-in user's picked team id (null when signed out or no pick).
 * PUT /api/matches/:matchId/prediction — signed-in user; body `{ teamId }` (teamA or teamB).
 * DELETE /api/matches/:matchId/prediction — signed-in user; removes their pick while SCHEDULED.
 *
 * Predictions are only open while the match is SCHEDULED, has both teams, isn't a pickup and the
 * tournament has predictions enabled.
 */

function parseMatchId(raw: string) {
	const id = Number.parseInt(raw, 10);
	return Number.isInteger(id) && id > 0 && String(id) === raw ? id : null;
}

const matchSelect = {
	id: true,
	status: true,
	isPickup: true,
	teamAId: true,
	teamBId: true,
	tournament: { select: { predictionsEnabled: true } },
} as const;

type PredictableMatch = {
	status: string;
	isPickup: boolean;
	teamAId: number | null;
	teamBId: number | null;
	tournament: { predictionsEnabled: boolean };
};

/** Why picks can't be changed right now, or null when they're open. */
function lockReason(match: PredictableMatch) {
	if (!match.tournament.predictionsEnabled) return 'Predictions are turned off for this tournament';
	if (match.isPickup) return 'Pickup matches can’t be predicted';
	if (match.teamAId === null || match.teamBId === null) return 'Predictions open once both teams are known';
	if (match.status !== 'SCHEDULED') return 'Predictions are locked once the match goes live';
	return null;
}

export async function GET(_request: Request, { params }: Params) {
	const matchId = parseMatchId((await params).matchId);
	if (matchId === null) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

	try {
		const match = await db.matches.findUnique({ where: { id: matchId }, select: matchSelect });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const session = await getAuthSession();
		const [grouped, own] = await Promise.all([
			db.prediction.groupBy({ by: ['pickedTeamId'], where: { matchId }, _count: { _all: true } }),
			session ? db.prediction.findUnique({ where: { userId_matchId: { userId: session.user.id, matchId } }, select: { pickedTeamId: true } }) : null,
		]);

		const countFor = (teamId: number | null) => (teamId === null ? 0 : (grouped.find((g) => g.pickedTeamId === teamId)?._count._all ?? 0));
		return NextResponse.json({
			enabled: match.tournament.predictionsEnabled && !match.isPickup,
			locked: lockReason(match) !== null,
			pick: own?.pickedTeamId ?? null,
			counts: { teamA: countFor(match.teamAId), teamB: countFor(match.teamBId) },
		});
	} catch (error) {
		console.error('Error fetching match prediction:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: Request, { params }: Params) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Sign in to predict' }, { status: 401 });

	const matchId = parseMatchId((await params).matchId);
	if (matchId === null) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

	const parsed = pickSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
	const { teamId } = parsed.data;

	try {
		const match = await db.matches.findUnique({ where: { id: matchId }, select: matchSelect });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const reason = lockReason(match);
		if (reason) return NextResponse.json({ error: reason }, { status: 409 });
		if (teamId !== match.teamAId && teamId !== match.teamBId) return NextResponse.json({ error: 'teamId must be one of the two teams in this match' }, { status: 400 });

		const userId = session.user.id;
		await db.prediction.upsert({
			where: { userId_matchId: { userId, matchId } },
			create: { userId, matchId, pickedTeamId: teamId },
			update: { pickedTeamId: teamId },
		});
		return NextResponse.json({ pick: teamId });
	} catch (error) {
		console.error('Error saving match prediction:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(_request: Request, { params }: Params) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Sign in to predict' }, { status: 401 });

	const matchId = parseMatchId((await params).matchId);
	if (matchId === null) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

	try {
		const match = await db.matches.findUnique({ where: { id: matchId }, select: matchSelect });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const reason = lockReason(match);
		if (reason) return NextResponse.json({ error: reason }, { status: 409 });

		await db.prediction.deleteMany({ where: { userId: session.user.id, matchId } });
		return NextResponse.json({ pick: null });
	} catch (error) {
		console.error('Error removing match prediction:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
