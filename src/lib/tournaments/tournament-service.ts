import { db } from '@/lib/db';
import { generateBracket, GeneratedMatch } from './bracket-generator';
import { Prisma, TournamentStatus } from '@prisma/client';

/**
 * Start a tournament by:
 * 1. Atomically flipping status UPCOMING -> ONGOING
 * 2. Generating the full bracket skeleton for the tournament's format
 * 3. Inserting all matches and wiring next-match/next-loser-match feeder pointers
 *
 * Everything happens in one transaction, so a crash partway through can never
 * leave a tournament ONGOING with zero (or partially-wired) matches.
 */
export async function startTournament(tournamentId: number) {
	const tournament = await db.cs2Tournament.findUnique({
		where: { id: tournamentId },
		include: { teams: true },
	});

	if (!tournament) {
		throw new Error(`Tournament ${tournamentId} not found`);
	}

	if (tournament.status !== TournamentStatus.UPCOMING) {
		throw new Error(`Tournament status is ${tournament.status}, not UPCOMING`);
	}

	if (tournament.teams.length < 2) {
		throw new Error('Tournament needs at least 2 teams to start');
	}

	if (tournament.format === 'DOUBLE_ELIMINATION' && tournament.teams.length < 4) {
		throw new Error('Double-elimination tournaments need at least 4 teams to start');
	}

	const generatedMatches = generateBracket(tournament.teams, tournament.format);

	const matchesCreated = await db.$transaction(async (tx) => {
		// Atomically claim the UPCOMING -> ONGOING transition so two concurrent callers
		// (e.g. a manual start racing the check-start cron) can't both pass the earlier
		// status check and double-generate brackets.
		const { count } = await tx.cs2Tournament.updateMany({
			where: { id: tournamentId, status: TournamentStatus.UPCOMING },
			data: { status: TournamentStatus.ONGOING },
		});

		if (count === 0) {
			throw new Error(`Tournament ${tournamentId} was already started by another request`);
		}

		const now = new Date();
		await tx.matches.createMany({
			data: generatedMatches.map((m) => ({
				tournamentId,
				teamAId: m.teamAId,
				teamBId: m.teamBId,
				winnerId: m.winnerId,
				status: m.status,
				round: m.round,
				position: m.position,
				bracketSlot: m.bracketSlot,
				matchDate: now,
				completedAt: m.status === 'COMPLETED' ? now : null,
			})),
		});

		// (round, bracketSlot, position) is a unique key within one tournament's bracket by
		// construction (see bracket-generator.ts) — used here to recover each inserted row's
		// real db id, since ids don't exist until after insert.
		const inserted = await tx.matches.findMany({
			where: { tournamentId },
			select: { id: true, round: true, position: true, bracketSlot: true },
		});
		const idFor = (round: number, position: number, bracketSlot: string): number => {
			const row = inserted.find((r) => r.round === round && r.position === position && r.bracketSlot === bracketSlot);
			if (!row) throw new Error(`Could not resolve inserted match for round=${round} position=${position} bracketSlot=${bracketSlot}`);
			return row.id;
		};

		for (const m of generatedMatches) {
			if (m.nextMatchLocalIndex === null && m.nextLoserMatchLocalIndex === null) continue;

			const data: Prisma.MatchesUpdateInput = {};
			if (m.nextMatchLocalIndex !== null) {
				const target = generatedMatches[m.nextMatchLocalIndex];
				data.nextMatchId = idFor(target.round, target.position, target.bracketSlot);
				data.nextMatchSlot = m.nextMatchSlot;
			}
			if (m.nextLoserMatchLocalIndex !== null) {
				const target = generatedMatches[m.nextLoserMatchLocalIndex];
				data.nextLoserMatchId = idFor(target.round, target.position, target.bracketSlot);
				data.nextLoserMatchSlot = m.nextLoserMatchSlot;
			}

			await tx.matches.update({ where: { id: idFor(m.round, m.position, m.bracketSlot) }, data });
		}

		return generatedMatches.length;
	});

	const updatedTournament = await db.cs2Tournament.findUniqueOrThrow({ where: { id: tournamentId } });

	return {
		tournament: updatedTournament,
		matchesCreated,
	};
}

/**
 * Check for tournaments that should be started based on their start date.
 * Called periodically by a cron job (see /api/tournaments/check-start).
 */
export async function checkAndStartTournaments() {
	const now = new Date();

	const tournamentsToStart = await db.cs2Tournament.findMany({
		where: {
			status: TournamentStatus.UPCOMING,
			startDate: { lte: now },
		},
	});

	const results = [];
	for (const tournament of tournamentsToStart) {
		try {
			const result = await startTournament(tournament.id);
			results.push({ tournamentId: tournament.id, success: true, matchesCreated: result.matchesCreated });
		} catch (error) {
			results.push({ tournamentId: tournament.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
		}
	}

	return {
		tournamentsProcessed: results.length,
		results,
	};
}

/**
 * Flips a tournament from ONGOING to COMPLETED once every one of its matches
 * has a status of COMPLETED. A no-op (not an error) if the tournament isn't
 * fully done yet or isn't currently ONGOING — this is the shared completeness
 * check called after every match result via `recordMatchResult`, so it must
 * be safe to call speculatively on every single match completion.
 */
export async function finalizeTournamentIfComplete(tx: Prisma.TransactionClient, tournamentId: number): Promise<void> {
	const incompleteCount = await tx.matches.count({ where: { tournamentId, status: { not: 'COMPLETED' } } });
	if (incompleteCount > 0) return;

	await tx.cs2Tournament.updateMany({
		where: { id: tournamentId, status: TournamentStatus.ONGOING },
		data: { status: TournamentStatus.COMPLETED, endDate: new Date() },
	});
}

/**
 * Manually/forcibly complete a tournament, erroring out (rather than silently
 * no-op-ing like `finalizeTournamentIfComplete`) if matches are still pending
 * — this is the explicit "an admin/cron asked to complete this" entry point.
 */
export async function completeTournament(tournamentId: number) {
	return db.$transaction(async (tx) => {
		const tournament = await tx.cs2Tournament.findUniqueOrThrow({ where: { id: tournamentId } });
		if (tournament.status !== TournamentStatus.ONGOING) {
			throw new Error(`Tournament status is ${tournament.status}, not ONGOING`);
		}

		const incompleteCount = await tx.matches.count({ where: { tournamentId, status: { not: 'COMPLETED' } } });
		if (incompleteCount > 0) {
			throw new Error(`Cannot complete tournament with ${incompleteCount} incomplete matches`);
		}

		await finalizeTournamentIfComplete(tx, tournamentId);
		return tx.cs2Tournament.findUniqueOrThrow({ where: { id: tournamentId } });
	});
}

export type { GeneratedMatch };
