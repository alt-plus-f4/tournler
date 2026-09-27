import type { DbTx } from '@/lib/db';
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

		// Batched as a single multi-row UPDATE instead of one `tx.matches.update` per match
		// (docs/SCALING_AT_1000_USERS.md #4): for a large bracket, N sequential round-trips inside one
		// open transaction holds a Postgres connection + row locks far longer than necessary,
		// which matters most exactly when connections are already scarce (#1).
		const feederUpdates = generatedMatches
			.filter((m) => m.nextMatchLocalIndex !== null || m.nextLoserMatchLocalIndex !== null)
			.map((m) => {
				const nextMatchTarget = m.nextMatchLocalIndex !== null ? generatedMatches[m.nextMatchLocalIndex] : null;
				const nextLoserMatchTarget = m.nextLoserMatchLocalIndex !== null ? generatedMatches[m.nextLoserMatchLocalIndex] : null;

				return {
					id: idFor(m.round, m.position, m.bracketSlot),
					nextMatchId: nextMatchTarget ? idFor(nextMatchTarget.round, nextMatchTarget.position, nextMatchTarget.bracketSlot) : null,
					nextMatchSlot: nextMatchTarget ? m.nextMatchSlot : null,
					nextLoserMatchId: nextLoserMatchTarget ? idFor(nextLoserMatchTarget.round, nextLoserMatchTarget.position, nextLoserMatchTarget.bracketSlot) : null,
					nextLoserMatchSlot: nextLoserMatchTarget ? m.nextLoserMatchSlot : null,
				};
			});

		if (feederUpdates.length > 0) {
			const rows = Prisma.join(
				feederUpdates.map(
					(u) =>
						Prisma.sql`(${u.id}::int, ${u.nextMatchId}::int, ${u.nextMatchSlot}::match_slot, ${u.nextLoserMatchId}::int, ${u.nextLoserMatchSlot}::match_slot)`,
				),
			);
			await tx.$executeRaw`
				UPDATE matches AS m
				SET next_match_id = v.next_match_id,
					next_match_slot = v.next_match_slot,
					next_loser_match_id = v.next_loser_match_id,
					next_loser_match_slot = v.next_loser_match_slot
				FROM (VALUES ${rows}) AS v(id, next_match_id, next_match_slot, next_loser_match_id, next_loser_match_slot)
				WHERE m.id = v.id
			`;
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
 * Bounded parallelism: cap must stay well under db.ts's per-instance Prisma pool size
 * (`connection_limit`), since each concurrent `startTournament` holds its own connection for the
 * duration of its transaction — unbounded concurrency here would exhaust that pool by itself.
 */
const MAX_CONCURRENT_TOURNAMENT_STARTS = 3;

async function mapWithConcurrencyLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;

	async function worker() {
		for (let index = next++; index < items.length; index = next++) {
			results[index] = await fn(items[index]);
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
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

	// Independent tournaments start concurrently, bounded, instead of strictly sequentially
	// (docs/SCALING_AT_1000_USERS.md #5) — several tournaments due in the same cron window no longer
	// make the whole run's wall-clock time scale linearly with how many are due at once.
	const results = await mapWithConcurrencyLimit(tournamentsToStart, MAX_CONCURRENT_TOURNAMENT_STARTS, async (tournament) => {
		try {
			const result = await startTournament(tournament.id);
			return { tournamentId: tournament.id, success: true, matchesCreated: result.matchesCreated };
		} catch (error) {
			return { tournamentId: tournament.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	});

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
export async function finalizeTournamentIfComplete(tx: DbTx, tournamentId: number): Promise<void> {
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
