import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { NextResponse } from 'next/server';

/**
 * GET /api/matches/[matchId]
 * Fetch match details including teams, scores, and game server info
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const { matchId } = await params;

		const match = await db.matches.findUnique({
			where: { id: parseInt(matchId) },
			include: {
				tournament: {
					select: {
						id: true,
						name: true,
						startDate: true,
						endDate: true,
						status: true,
					},
				},
				teamA: {
					include: {
						members: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
				teamB: {
					include: {
						members: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
				winner: true,
				gameServer: true,
			},
		});

		if (!match) {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}

		return NextResponse.json({ match });
	} catch (error) {
		console.error('Error fetching match:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}

/**
 * PATCH /api/matches/[matchId]
 * Update match details (scores, winner, etc.)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) {
			return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
		}

		const data = await request.json();

		const match = await db.matches.findUnique({
			where: { id: parsedMatchId },
			include: { tournament: true },
		});

		if (!match) {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}

		const canManageMatches = await userHasPermission(session.user.id, 'matches:manage');
		if (match.tournament.organizerId !== session.user.id && !canManageMatches) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const updatedMatch = await db.matches.update({
			where: { id: parsedMatchId },
			data: {
				scoreTeamA: data.scoreTeamA !== undefined ? data.scoreTeamA : match.scoreTeamA,
				scoreTeamB: data.scoreTeamB !== undefined ? data.scoreTeamB : match.scoreTeamB,
				winnerId: data.winnerId !== undefined ? data.winnerId : match.winnerId,
				matchDate: data.matchDate !== undefined ? new Date(data.matchDate) : match.matchDate,
			},
			include: {
				teamA: true,
				teamB: true,
				winner: true,
			},
		});

		return NextResponse.json({
			success: true,
			match: updatedMatch,
		});
	} catch (error) {
		console.error('Error updating match:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
