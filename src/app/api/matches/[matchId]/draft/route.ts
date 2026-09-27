import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getDraftState, recordDraftPick, DraftError } from '@/lib/tournaments/draft';
import { Prisma } from '@prisma/client';
import { HostedServerUnsupportedError, hostsGameServers } from '@/lib/tournaments/game-rules';

function loadMatchForDraft(matchId: number) {
	return db.matches.findUnique({
		where: { id: matchId },
		include: {
			tournament: { select: { organizerId: true, game: true } },
			participants: { orderBy: { joinedAt: 'asc' } },
			draftPicks: { orderBy: { order: 'asc' } },
		},
	});
}

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	const { matchId } = await params;
	const id = Number.parseInt(matchId, 10);
	if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

	const match = await loadMatchForDraft(id);
	if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
	if (!hostsGameServers(match.tournament.game)) return NextResponse.json({ error: new HostedServerUnsupportedError(match.tournament.game, 'draft players for').message }, { status: 409 });
	if (!match.isPickup || match.pickupMode !== 'CAPTAIN_DRAFT') return NextResponse.json({ error: 'This match has no captain draft' }, { status: 400 });

	const state = getDraftState(match.participants, match.draftPicks);
	return NextResponse.json(state);
}

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const id = Number.parseInt(matchId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const body = await request.json().catch(() => null);
		const pickedUserId: string | undefined = body?.pickedUserId;
		if (!pickedUserId || typeof pickedUserId !== 'string') {
			return NextResponse.json({ error: 'pickedUserId is required' }, { status: 400 });
		}

		const match = await loadMatchForDraft(id);
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		if (!hostsGameServers(match.tournament.game)) return NextResponse.json({ error: new HostedServerUnsupportedError(match.tournament.game, 'draft players for').message }, { status: 409 });
		if (!match.isPickup || match.pickupMode !== 'CAPTAIN_DRAFT') {
			return NextResponse.json({ error: 'This match has no captain draft' }, { status: 400 });
		}
		if (match.status !== 'SCHEDULED') {
			return NextResponse.json({ error: 'Match is not in a draftable state' }, { status: 409 });
		}

		const state = getDraftState(match.participants, match.draftPicks);
		if (state.phase === 'COMPLETE') {
			return NextResponse.json({ error: 'Draft is already complete' }, { status: 409 });
		}
		if (state.phase === 'NOT_STARTED' && (!state.captainAUserId || !state.captainBUserId)) {
			return NextResponse.json({ error: 'Both captains must be present before drafting can start' }, { status: 400 });
		}
		if (!state.poolUserIds.includes(pickedUserId)) {
			return NextResponse.json({ error: 'That player is not in the draft pool' }, { status: 400 });
		}

		const actingCaptainUserId = state.currentTurnSide === 'TEAM_A' ? state.captainAUserId : state.captainBUserId;
		const isActingCaptain = actingCaptainUserId === session.user.id;
		const isOrganizer = match.tournament.organizerId === session.user.id;
		const canManage = await userHasPermission(session.user.id, 'matches:manage');

		if (!isActingCaptain && !isOrganizer && !canManage) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.$transaction(async (tx) => {
			try {
				await recordDraftPick(tx, id, state.currentTurnSide!, pickedUserId, state.picks.length);
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
					throw new DraftError('Lost a race to another concurrent pick — refresh and try again');
				}
				throw error;
			}
		});

		const updatedMatch = await loadMatchForDraft(id);
		const updatedState = getDraftState(updatedMatch!.participants, updatedMatch!.draftPicks);
		return NextResponse.json(updatedState);
	} catch (error) {
		if (error instanceof DraftError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error recording draft pick:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
