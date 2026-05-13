import { db } from '@/lib/db';
import { generateBracket } from './bracket-generator';
import { TournamentStatus } from '@prisma/client';

/**
 * Start a tournament by:
 * 1. Updating status to ONGOING
 * 2. Fetching all registered teams
 * 3. Generating bracket matches
 * 4. Creating match records in the database
 */
export async function startTournament(tournamentId: number) {
	try {
		// Fetch the tournament
		const tournament = await db.cs2Tournament.findUnique({
			where: { id: tournamentId },
			include: {
				teams: {
					include: { members: true },
				},
			},
		});

		if (!tournament) {
			throw new Error(`Tournament ${tournamentId} not found`);
		}

		// Check if tournament is already running or completed
		if (tournament.status !== TournamentStatus.UPCOMING) {
			throw new Error(`Tournament status is ${tournament.status}, not UPCOMING`);
		}

		// Check if we have enough teams
		if (tournament.teams.length < 2) {
			throw new Error('Tournament needs at least 2 teams to start');
		}

		// Generate bracket matches
		const bracketMatches = generateBracket(tournament.teams, 'single-elimination');

		// Create matches in the database
		const createdMatches = await Promise.all(
			bracketMatches.map((match) =>
				db.matches.create({
					data: {
						tournamentId,
						teamAId: match.teamAId,
						teamBId: match.teamBId,
						matchDate: new Date(), // Initial date, will be scheduled later
					},
				}),
			),
		);

		// Update tournament status to ONGOING
		const updatedTournament = await db.cs2Tournament.update({
			where: { id: tournamentId },
			data: { status: TournamentStatus.ONGOING },
		});

		return {
			tournament: updatedTournament,
			matchesCreated: createdMatches.length,
		};
	} catch (error) {
		console.error(`Error starting tournament ${tournamentId}:`, error);
		throw error;
	}
}

/**
 * Check for tournaments that should be started based on their start date
 * This would be called by a cron job periodically
 */
export async function checkAndStartTournaments() {
	try {
		const now = new Date();

		// Find upcoming tournaments whose start time has passed
		const tournamentsToStart = await db.cs2Tournament.findMany({
			where: {
				status: TournamentStatus.UPCOMING,
				startDate: {
					lte: now,
				},
			},
		});

		const results = [];

		for (const tournament of tournamentsToStart) {
			try {
				const result = await startTournament(tournament.id);
				results.push({
					tournamentId: tournament.id,
					success: true,
					matchesCreated: result.matchesCreated,
				});
			} catch (error) {
				results.push({
					tournamentId: tournament.id,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return {
			tournamentsProcessed: results.length,
			results,
		};
	} catch (error) {
		console.error('Error checking tournaments:', error);
		throw error;
	}
}

/**
 * Complete a tournament by:
 * 1. Ensuring all matches are completed
 * 2. Finding the winner (for single elimination)
 * 3. Updating tournament status to COMPLETED
 */
export async function completeTournament(tournamentId: number) {
	try {
		const tournament = await db.cs2Tournament.findUnique({
			where: { id: tournamentId },
			include: {
				matches: {
					include: {
						winner: true,
					},
				},
			},
		});

		if (!tournament) {
			throw new Error(`Tournament ${tournamentId} not found`);
		}

		// Check if all matches are completed
		const incompleteMatches = tournament.matches.filter((m) => !m.winnerId);
		if (incompleteMatches.length > 0) {
			throw new Error(`Cannot complete tournament with ${incompleteMatches.length} incomplete matches`);
		}

		// Update tournament status
		const updated = await db.cs2Tournament.update({
			where: { id: tournamentId },
			data: {
				status: TournamentStatus.COMPLETED,
				endDate: new Date(),
			},
		});

		return updated;
	} catch (error) {
		console.error(`Error completing tournament ${tournamentId}:`, error);
		throw error;
	}
}
