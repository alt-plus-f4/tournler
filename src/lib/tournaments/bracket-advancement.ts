import { db } from '@/lib/db';
import { Matches, MatchSlot, Prisma } from '@prisma/client';
import { finalizeTournamentIfComplete } from './tournament-service';

type Tx = Prisma.TransactionClient;

/** Thrown when a match result conflicts with an already-recorded, different result. */
export class MatchResultConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MatchResultConflictError';
	}
}

export interface MatchResultInput {
	scoreTeamA?: number;
	scoreTeamB?: number;
	winnerId?: number;
}

function slotField(slot: MatchSlot): 'teamAId' | 'teamBId' {
	return slot === 'TEAM_A' ? 'teamAId' : 'teamBId';
}

/** Fills an empty bracket slot on the target match. A no-op if the slot is already filled (idempotent against retries — each slot has exactly one designated feeder, wired once at generation time). */
async function fillSlot(tx: Tx, targetMatchId: number, slot: MatchSlot, teamId: number) {
	await tx.matches.updateMany({
		where: { id: targetMatchId, [slotField(slot)]: null },
		data: { [slotField(slot)]: teamId },
	});
}

/** Propagates a just-completed match's winner (and, for elimination brackets, its loser) into whatever it feeds. */
async function propagateWinner(tx: Tx, match: Matches) {
	if (match.winnerId === null || match.teamAId === null || match.teamBId === null) return;
	const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;

	if (match.nextMatchId !== null && match.nextMatchSlot !== null) {
		await fillSlot(tx, match.nextMatchId, match.nextMatchSlot, match.winnerId);
	}

	if (match.nextLoserMatchId !== null && match.nextLoserMatchSlot !== null) {
		await fillSlot(tx, match.nextLoserMatchId, match.nextLoserMatchSlot, loserId);
	}

	// Grand Final bracket reset: TEAM_A is always the winners-bracket side by construction
	// (see bracket-generator.ts). If the losers-bracket side (TEAM_B) wins game 1, the
	// losers-bracket team has now beaten the winners-bracket team only once — double
	// elimination requires a second, deciding match. This is the one match created at
	// runtime rather than precomputed, since whether it's needed is only known now.
	if (match.bracketSlot === 'GRAND_FINAL' && match.round === 1 && match.winnerId === match.teamBId) {
		await tx.matches.create({
			data: {
				tournamentId: match.tournamentId,
				teamAId: match.teamAId,
				teamBId: match.teamBId,
				matchDate: new Date(),
				round: 2,
				position: 0,
				bracketSlot: 'GRAND_FINAL',
			},
		});
	}
}

/**
 * Records a match result (score and/or final winner), advancing the bracket and
 * finalizing the tournament as needed. The single write path shared by the
 * CS2 game-server ingestion route and the manual match-edit route.
 *
 * Idempotent: re-recording the same winner on an already-completed match is a
 * no-op (safe for game-server retries). Recording a *different* winner on an
 * already-completed match throws `MatchResultConflictError`.
 */
export async function recordMatchResult(matchId: number, input: MatchResultInput): Promise<Matches> {
	return db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });

		if (match.teamAId === null || match.teamBId === null) {
			throw new Error('Cannot record a result for a match whose bracket slots are not both filled yet');
		}

		if (input.winnerId !== undefined && input.winnerId !== match.teamAId && input.winnerId !== match.teamBId) {
			throw new Error('winnerId must be one of the match participants');
		}

		if (match.status === 'COMPLETED') {
			if (input.winnerId !== undefined && input.winnerId !== match.winnerId) {
				throw new MatchResultConflictError(`Match ${matchId} is already completed with a different winner`);
			}
			return match;
		}

		const now = new Date();
		const isCompleting = input.winnerId !== undefined;

		const { count } = await tx.matches.updateMany({
			where: { id: matchId, status: { not: 'COMPLETED' } },
			data: {
				scoreTeamA: input.scoreTeamA,
				scoreTeamB: input.scoreTeamB,
				winnerId: input.winnerId,
				status: isCompleting ? 'COMPLETED' : 'LIVE',
				startedAt: match.startedAt ?? now,
				completedAt: isCompleting ? now : undefined,
			},
		});

		if (count === 0) {
			// Lost a race to another concurrent writer — re-check whether it converged to the
			// same result (idempotent) or a genuine conflict.
			const raced = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });
			if (input.winnerId !== undefined && raced.winnerId !== input.winnerId) {
				throw new MatchResultConflictError(`Match ${matchId} was completed concurrently with a different winner`);
			}
			return raced;
		}

		const updated = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });

		if (updated.status === 'COMPLETED') {
			await propagateWinner(tx, updated);
			await finalizeTournamentIfComplete(tx, updated.tournamentId);
		}

		return updated;
	});
}

export interface RoundRobinStanding {
	teamId: number;
	wins: number;
	losses: number;
	played: number;
}

/** Computed on read (not persisted): wins desc, then head-to-head, then team id as a deterministic final tiebreak. */
export async function computeRoundRobinStandings(tournamentId: number): Promise<RoundRobinStanding[]> {
	const tournament = await db.cs2Tournament.findUniqueOrThrow({
		where: { id: tournamentId },
		include: { teams: true, matches: true },
	});

	const standings = new Map<number, RoundRobinStanding>();
	for (const team of tournament.teams) {
		standings.set(team.id, { teamId: team.id, wins: 0, losses: 0, played: 0 });
	}

	const completed = tournament.matches.filter((m) => m.status === 'COMPLETED' && m.winnerId !== null);
	for (const m of completed) {
		const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
		const winner = standings.get(m.winnerId as number);
		const loser = loserId !== null ? standings.get(loserId) : undefined;
		if (winner) {
			winner.wins += 1;
			winner.played += 1;
		}
		if (loser) {
			loser.losses += 1;
			loser.played += 1;
		}
	}

	const headToHeadWinner = (aId: number, bId: number): number | null => {
		const match = completed.find((m) => (m.teamAId === aId && m.teamBId === bId) || (m.teamAId === bId && m.teamBId === aId));
		return match?.winnerId ?? null;
	};

	return Array.from(standings.values()).sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		const h2h = headToHeadWinner(a.teamId, b.teamId);
		if (h2h === a.teamId) return -1;
		if (h2h === b.teamId) return 1;
		return a.teamId - b.teamId;
	});
}
