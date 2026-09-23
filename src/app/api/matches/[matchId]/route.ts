import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { MatchLifecycleError, MatchResultConflictError, recordMatchResult, startMatch, pauseMatch, resumeMatch, restartMatch, forceStartMatch } from '@/lib/tournaments/bracket-advancement';
import { getFaceitInfo } from '@/lib/faceit';
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
						organizerId: true,
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
								steam: { select: { steamId: true } },
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
								steam: { select: { steamId: true } },
							},
						},
					},
				},
				winner: true,
				gameServer: true,
				participants: {
					include: { user: { select: { id: true, name: true, image: true, steam: { select: { steamId: true } } } } },
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

		// Real FACEIT CS2 levels for every rostered player (teams or pickup sides), looked up by
		// their linked Steam account — same source as the profile page (src/lib/faceit.ts), not the
		// account-age-based fallback the match page used to show. One lookup per unique steamId
		// (getFaceitInfo itself caches each for an hour), attached back onto every roster/participant
		// row that shares it so the frontend never needs its own extra round-trip.
		const rosteredMembers = [...(match.teamA?.members ?? []), ...(match.teamB?.members ?? []), ...match.participants.map((p) => p.user)];
		const uniqueSteamIds = [...new Set(rosteredMembers.map((m) => m.steam?.steamId).filter((id): id is string => !!id))];
		const levelBySteamId = new Map(await Promise.all(uniqueSteamIds.map(async (steamId) => [steamId, (await getFaceitInfo(steamId))?.level ?? null] as const)));
		const withFaceitLevel = <T extends { steam: { steamId: string } | null }>(m: T) => ({ ...m, faceitLevel: m.steam ? (levelBySteamId.get(m.steam.steamId) ?? null) : null });
		const matchWithFaceitLevels = {
			...match,
			teamA: match.teamA ? { ...match.teamA, members: match.teamA.members.map(withFaceitLevel) } : null,
			teamB: match.teamB ? { ...match.teamB, members: match.teamB.members.map(withFaceitLevel) } : null,
			participants: match.participants.map((p) => ({ ...p, user: withFaceitLevel(p.user) })),
		};

		// The connect password is the one thing standing between "anyone who loads this public
		// page" and "anyone who can actually play" — MatchZy's own roster whitelist aside, there's
		// no reason to hand it to a visitor who isn't an organizer/admin or one of the two rostered
		// sides. Strip it (not the rest of gameServer — connectIp/port alone are useless without it,
		// and organizers/spectators still legitimately want to see server status) for everyone else.
		const session = await getAuthSession();
		const viewerId = session?.user?.id;
		let canSeePassword = false;
		if (viewerId) {
			const isOrganizerOrAdmin = match.tournament.organizerId === viewerId || (await userHasPermission(viewerId, 'matches:manage'));
			const isRostered = match.isPickup ? match.participants.some((p) => p.user.id === viewerId) : [...(match.teamA?.members ?? []), ...(match.teamB?.members ?? [])].some((m) => m.id === viewerId);
			canSeePassword = isOrganizerOrAdmin || isRostered;
		}

		const responseMatch = matchWithFaceitLevels.gameServer && !canSeePassword ? { ...matchWithFaceitLevels, gameServer: { ...matchWithFaceitLevels.gameServer, password: null } } : matchWithFaceitLevels;

		return NextResponse.json({ match: responseMatch });
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
				case 'FORCE_START': {
					const result = await forceStartMatch(parsedMatchId);
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

/**
 * DELETE /api/matches/[matchId]
 * Permanently removes a match — GameServer/MatchMap/MatchMapAction/PlayerMatchStat/
 * MatchParticipant rows cascade with it (all declare `onDelete: Cascade` toward Matches).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
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

		if (match.status === 'LIVE' || match.status === 'PAUSED') {
			return NextResponse.json({ error: 'Cannot delete a match that is currently live or paused — end or restart it first.' }, { status: 409 });
		}

		// Refuse to delete a match another match's bracket advancement still points at — that would
		// leave the earlier match's nextMatchId/nextLoserMatchId dangling. nextMatchId/nextLoserMatchId
		// are plain columns (see the schema comment on Matches), so this isn't caught by the cascade.
		const feedsInto = await db.matches.findFirst({
			where: { OR: [{ nextMatchId: parsedMatchId }, { nextLoserMatchId: parsedMatchId }] },
			select: { id: true },
		});
		if (feedsInto) {
			return NextResponse.json({ error: `Match ${feedsInto.id} advances into this match — remove it from the bracket first, or delete the whole tournament instead.` }, { status: 409 });
		}

		await db.matches.delete({ where: { id: parsedMatchId } });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting match:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
