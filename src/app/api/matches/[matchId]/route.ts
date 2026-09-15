import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { MatchLifecycleError, MatchResultConflictError, recordMatchResult, startMatch, pauseMatch, resumeMatch, restartMatch } from '@/lib/tournaments/bracket-advancement';
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
					select: {
						id: true,
						name: true,
						logo: true,
						background: true,
						capitanId: true,
						members: {
							select: {
								id: true,
								name: true,
								image: true,
								createdAt: true,
							},
						},
					},
				},
				teamB: {
					select: {
						id: true,
						name: true,
						logo: true,
						background: true,
						capitanId: true,
						members: {
							select: {
								id: true,
								name: true,
								image: true,
								createdAt: true,
							},
						},
					},
				},
				winner: true,
				gameServer: true,
				participants: {
					include: { user: { select: { id: true, name: true, image: true } } },
					orderBy: { joinedAt: 'asc' },
				},
				mapActions: { orderBy: { order: 'asc' } },
				maps: { orderBy: { order: 'asc' } },
				playerStats: {
					include: { user: { select: { id: true, name: true, image: true } } },
					orderBy: { kills: 'desc' },
				},
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

		let configPushError: string | null = null;
		if (data.action !== undefined) {
			switch (data.action) {
				case 'START': {
					const result = await startMatch(parsedMatchId);
					configPushError = result.configPushError;
					break;
				}
				case 'PAUSE': {
					const result = await pauseMatch(parsedMatchId);
					configPushError = result.configPushError;
					break;
				}
				case 'RESUME': {
					const result = await resumeMatch(parsedMatchId);
					configPushError = result.configPushError;
					break;
				}
				case 'RESTART': {
					const result = await restartMatch(parsedMatchId);
					configPushError = result.configPushError;
					break;
				}
				default:
					return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
			}
		}

		if (data.matchDate !== undefined) {
			await db.matches.update({ where: { id: parsedMatchId }, data: { matchDate: new Date(data.matchDate) } });
		}

		if (data.winnerSide !== undefined && data.winnerSide !== 'TEAM_A' && data.winnerSide !== 'TEAM_B') {
			return NextResponse.json({ error: 'winnerSide must be TEAM_A or TEAM_B' }, { status: 400 });
		}

		if (data.scoreTeamA !== undefined || data.scoreTeamB !== undefined || data.winnerId !== undefined || data.winnerSide !== undefined) {
			await recordMatchResult(parsedMatchId, {
				scoreTeamA: data.scoreTeamA,
				scoreTeamB: data.scoreTeamB,
				winnerId: data.winnerId,
				winnerSide: data.winnerSide,
			});
		}

		const updatedMatch = await db.matches.findUniqueOrThrow({
			where: { id: parsedMatchId },
			include: {
				teamA: true,
				teamB: true,
				winner: true,
			},
		});

		return NextResponse.json({
			success: true,
			match: updatedMatch,
			// Set only when a START action's RCON push to the game server failed — the match is still
			// LIVE in the DB, but the veto result/teams/password may not actually be loaded on the real
			// server. The UI should surface this and offer the manual sync endpoint as a retry.
			configPushError,
		});
	} catch (error) {
		if (error instanceof MatchResultConflictError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		if (error instanceof MatchLifecycleError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error updating match:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
