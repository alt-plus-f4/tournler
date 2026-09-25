import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { generateFakeTeamNames } from '@/lib/helpers/fake-team-names';
import { generateFakePlayers } from '@/lib/helpers/fake-player-names';
import { startTournament } from '@/lib/tournaments/tournament-service';
import { recordMatchResult } from '@/lib/tournaments/bracket-advancement';
import { upsertPlayerMatchStats, PlayerStatInput } from '@/lib/tournaments/player-stats';
import { Game, TournamentFormat } from '@prisma/client';
import { GAMES } from '@/lib/games';

const MIN_TEAMS = 2;
const MAX_TEAMS = 64;
const DOUBLE_ELIMINATION_MIN_TEAMS = 4;
const PLAYERS_PER_TEAM = 5;
const SIMULATED_TOURNAMENT_NAME_PREFIX = 'Simulated Tournament ';
const SIMULATED_EMAIL_DOMAIN = '@simulated.tournler.local';

function randomStat(max: number): number {
	return Math.floor(Math.random() * (max + 1));
}

function parseGame(raw: unknown): Game | null {
	if (raw === undefined) return 'CS2';
	const normalized = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
	return (GAMES as readonly string[]).includes(normalized) ? (normalized as Game) : null;
}

function parseFormat(raw: unknown): TournamentFormat | null {
	if (typeof raw !== 'string') return TournamentFormat.SINGLE_ELIMINATION;
	const normalized = raw.trim().toUpperCase();
	if (normalized in TournamentFormat) {
		return TournamentFormat[normalized as keyof typeof TournamentFormat];
	}
	return null;
}

/**
 * POST /api/tournaments/simulate
 * Dev/demo helper: creates N fake teams and a tournament in the requested
 * format, starts it, then auto-plays every match with random results until
 * the tournament is fully COMPLETED. Lets an admin see the whole bracket
 * engine (byes, round advancement, double-elim resets) without manually
 * registering teams or completing matches one at a time.
 */
export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!(await userHasPermission(session.user.id, 'tournaments:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json().catch(() => ({}));
		const teamCount = Number.parseInt(body.teamCount, 10);
		const format = parseFormat(body.format);
		const game = parseGame(body.game);

		if (!format) {
			return NextResponse.json({ error: 'Invalid format value' }, { status: 400 });
		}
		if (!game) {
			return NextResponse.json({ error: 'Invalid game value' }, { status: 400 });
		}
		if (!Number.isFinite(teamCount) || teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
			return NextResponse.json({ error: `teamCount must be between ${MIN_TEAMS} and ${MAX_TEAMS}` }, { status: 400 });
		}
		if (format === TournamentFormat.DOUBLE_ELIMINATION && teamCount < DOUBLE_ELIMINATION_MIN_TEAMS) {
			return NextResponse.json({ error: `Double-elimination needs at least ${DOUBLE_ELIMINATION_MIN_TEAMS} teams` }, { status: 400 });
		}

		const tournament = await db.cs2Tournament.create({
			data: {
				name: `${SIMULATED_TOURNAMENT_NAME_PREFIX}${new Date().toISOString()}`,
				startDate: new Date(Date.now() - 1000),
				endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				teamCapacity: teamCount,
				location: 'Simulation',
				type: 'ONLINE',
				status: 'UPCOMING',
				format,
				game,
				organizerId: session.user.id,
			},
		});

		const teamNames = generateFakeTeamNames(teamCount);
		const fakePlayers = generateFakePlayers(teamCount * PLAYERS_PER_TEAM);

		let playerIndex = 0;
		for (const name of teamNames) {
			const roster = fakePlayers.slice(playerIndex, playerIndex + PLAYERS_PER_TEAM);
			playerIndex += PLAYERS_PER_TEAM;
			// Team membership is many-to-many (src/lib/teams/membership.ts) — creating the fake
			// roster nested under the team connects them in one write instead of the old scalar
			// User.cs2TeamId, which no longer exists.
			await db.cs2Team.create({
				data: {
					name,
					cs2TournamentId: tournament.id,
					game,
					members: {
						create: roster.map((player) => ({
							name: player.name,
							email: player.email,
							isOnboardingCompleted: true,
							emailVerified: new Date(),
						})),
					},
				},
			});
		}

		await startTournament(tournament.id);

		// Auto-play every match as its bracket slots fill in, until nothing is
		// left playable. Re-queries each iteration since completing a match can
		// unlock (or, for a double-elim bracket reset, create) further matches.
		const maxIterations = teamCount * 4 + 50;
		let matchesPlayed = 0;
		for (let i = 0; i < maxIterations; i++) {
			const current = await db.cs2Tournament.findUniqueOrThrow({ where: { id: tournament.id } });
			if (current.status === 'COMPLETED') break;

			const readyMatch = await db.matches.findFirst({
				where: { tournamentId: tournament.id, status: { in: ['SCHEDULED', 'LIVE'] }, teamAId: { not: null }, teamBId: { not: null } },
			});
			if (!readyMatch) break;

			const winnerId = Math.random() < 0.5 ? readyMatch.teamAId! : readyMatch.teamBId!;
			const winnerScore = 13 + Math.floor(Math.random() * 4);
			const loserScore = Math.floor(Math.random() * (winnerScore - 1));

			const [teamA, teamB] = await Promise.all([db.cs2Team.findUnique({ where: { id: readyMatch.teamAId! }, include: { members: true } }), db.cs2Team.findUnique({ where: { id: readyMatch.teamBId! }, include: { members: true } })]);
			const playerStats: PlayerStatInput[] = [
				...(teamA?.members ?? []).map((member) => ({ userId: member.id, teamId: teamA!.id, kills: randomStat(30), deaths: randomStat(20), assists: randomStat(10) })),
				...(teamB?.members ?? []).map((member) => ({ userId: member.id, teamId: teamB!.id, kills: randomStat(30), deaths: randomStat(20), assists: randomStat(10) })),
			];

			await recordMatchResult(readyMatch.id, {
				scoreTeamA: winnerId === readyMatch.teamAId ? winnerScore : loserScore,
				scoreTeamB: winnerId === readyMatch.teamBId ? winnerScore : loserScore,
				winnerId,
			});
			if (playerStats.length > 0) {
				await upsertPlayerMatchStats(readyMatch.id, playerStats);
			}
			matchesPlayed++;
		}

		const finalTournament = await db.cs2Tournament.findUniqueOrThrow({ where: { id: tournament.id } });
		const matches = await db.matches.findMany({ where: { tournamentId: tournament.id } });

		return NextResponse.json({
			success: true,
			tournament: finalTournament,
			teamsCreated: teamCount,
			matchesCreated: matches.length,
			matchesPlayed,
			fullyCompleted: finalTournament.status === 'COMPLETED',
		});
	} catch (error) {
		console.error('Error simulating tournament:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}

/**
 * DELETE /api/tournaments/simulate
 * Wipes every tournament ever created by the simulate endpoint above, along
 * with their teams and the fake player accounts generated for them — an
 * explicit, on-demand cleanup rather than something that runs automatically,
 * so a simulated tournament sticks around for inspection until an admin
 * chooses to clear it out.
 */
export async function DELETE() {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!(await userHasPermission(session.user.id, 'tournaments:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const tournaments = await db.cs2Tournament.findMany({
			where: { name: { startsWith: SIMULATED_TOURNAMENT_NAME_PREFIX } },
			select: { id: true },
		});
		const tournamentIds = tournaments.map((t) => t.id);

		if (tournamentIds.length === 0) {
			return NextResponse.json({ success: true, tournamentsDeleted: 0, teamsDeleted: 0, playersDeleted: 0 });
		}

		const teams = await db.cs2Team.findMany({
			where: { cs2TournamentId: { in: tournamentIds } },
			select: { id: true },
		});
		const teamIds = teams.map((t) => t.id);

		// Deletion order respects the schema's referential actions: teams
		// Restrict-block tournament deletion while they still reference it, and
		// users are only ever SetNull'd (not cascaded) when their team goes away
		// — so fake players and teams must be deleted explicitly, before the
		// tournament, rather than relied on to cascade.
		const { count: playersDeleted } = await db.user.deleteMany({
			where: { teams: { some: { id: { in: teamIds } } }, email: { endsWith: SIMULATED_EMAIL_DOMAIN } },
		});
		await db.matches.deleteMany({ where: { tournamentId: { in: tournamentIds } } });
		const { count: teamsDeleted } = await db.cs2Team.deleteMany({ where: { id: { in: teamIds } } });
		const { count: tournamentsDeleted } = await db.cs2Tournament.deleteMany({ where: { id: { in: tournamentIds } } });

		return NextResponse.json({ success: true, tournamentsDeleted, teamsDeleted, playersDeleted });
	} catch (error) {
		console.error('Error deleting simulated tournaments:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
