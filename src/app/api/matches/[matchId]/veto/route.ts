import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getVetoState, finalizeVeto, VetoError, VetoAction } from '@/lib/tournaments/veto';
import { Prisma } from '@prisma/client';

function loadMatchForVeto(matchId: number) {
	return db.matches.findUnique({
		where: { id: matchId },
		include: {
			tournament: true,
			mapActions: { orderBy: { order: 'asc' } },
			teamA: { include: { members: { select: { id: true } } } },
			teamB: { include: { members: { select: { id: true } } } },
		},
	});
}

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	const { matchId } = await params;
	const id = Number.parseInt(matchId, 10);
	if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

	const match = await loadMatchForVeto(id);
	if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

	const state = getVetoState(match, match.tournament.mapPool, match.tournament.bestOf);
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
		const action: VetoAction | undefined = body?.action;
		const mapName: string | undefined = body?.mapName;
		if (action !== 'BAN' && action !== 'PICK') {
			return NextResponse.json({ error: 'action must be BAN or PICK' }, { status: 400 });
		}
		if (!mapName || typeof mapName !== 'string') {
			return NextResponse.json({ error: 'mapName is required' }, { status: 400 });
		}

		const match = await loadMatchForVeto(id);
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		if (match.isPickup) return NextResponse.json({ error: 'Pickup matches have no map veto' }, { status: 400 });
		if (match.teamAId === null || match.teamBId === null) {
			return NextResponse.json({ error: 'Both team slots must be filled before veto can start' }, { status: 400 });
		}
		if (match.status !== 'SCHEDULED') {
			return NextResponse.json({ error: 'Match is not in a vetoable state' }, { status: 409 });
		}

		const state = getVetoState(match, match.tournament.mapPool, match.tournament.bestOf);
		if (state.phase === 'COMPLETE') {
			return NextResponse.json({ error: 'Map veto is already complete' }, { status: 409 });
		}
		if (state.nextActionType !== action) {
			return NextResponse.json({ error: `Expected a ${state.nextActionType}, got ${action}` }, { status: 409 });
		}
		if (!state.availableMaps.includes(mapName)) {
			return NextResponse.json({ error: 'Map is not available' }, { status: 400 });
		}

		const actingTeamId = state.currentTurnTeamId;
		const actingTeam = actingTeamId === match.teamAId ? match.teamA : match.teamB;
		const isTeamMember = actingTeam?.members.some((member) => member.id === session.user.id) ?? false;
		const isOrganizer = match.tournament.organizerId === session.user.id;
		const canManage = await userHasPermission(session.user.id, 'matches:manage');

		if (!isTeamMember && !isOrganizer && !canManage) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.$transaction(async (tx) => {
			try {
				await tx.matchMapAction.create({
					data: { matchId: id, teamId: actingTeamId, action, mapName, order: state.actions.length },
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
					throw new VetoError('Lost a race to another concurrent veto action — refresh and try again');
				}
				throw error;
			}
			await finalizeVeto(tx, id);
		});

		const updatedMatch = await loadMatchForVeto(id);
		const updatedState = getVetoState(updatedMatch!, updatedMatch!.tournament.mapPool, updatedMatch!.tournament.bestOf);
		return NextResponse.json(updatedState);
	} catch (error) {
		if (error instanceof VetoError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error recording veto action:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
