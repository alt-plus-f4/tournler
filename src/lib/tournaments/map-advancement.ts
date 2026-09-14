import { db } from '@/lib/db';
import { recordMatchResult, MatchResultConflictError } from './bracket-advancement';
import { normalizeBestOf } from './veto';

export interface MapResultInput {
	scoreTeamA?: number;
	scoreTeamB?: number;
	winnerId?: number;
}

/**
 * Records a single map's result within a bo1/bo3 series. Updates the `MatchMap` row, recomputes
 * the series map-win count onto `Matches.scoreTeamA`/`scoreTeamB`, and — only once one team
 * reaches the series-clinching win count (1 for bo1, 2 for bo3) — calls the existing,
 * unmodified `recordMatchResult` so all bracket-propagation code fires exactly once, at
 * series-decision time.
 *
 * Idempotent, matching `recordMatchResult`'s conflict semantics: re-recording the same winner on
 * an already-completed map is a no-op; a different winner throws `MatchResultConflictError`.
 */
export async function recordMapResult(matchId: number, mapOrder: number, input: MapResultInput): Promise<void> {
	const seriesDecision = await db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId }, include: { tournament: true } });
		const mapRow = await tx.matchMap.findUniqueOrThrow({ where: { matchId_order: { matchId, order: mapOrder } } });

		if (input.winnerId !== undefined && input.winnerId !== match.teamAId && input.winnerId !== match.teamBId) {
			throw new Error('winnerId must be one of the match participants');
		}

		if (mapRow.status === 'COMPLETED') {
			if (input.winnerId !== undefined && input.winnerId !== mapRow.winnerId) {
				throw new MatchResultConflictError(`Map ${mapOrder} of match ${matchId} is already completed with a different winner`);
			}
			return null;
		}

		const now = new Date();
		const isCompleting = input.winnerId !== undefined;

		await tx.matchMap.update({
			where: { id: mapRow.id },
			data: {
				scoreTeamA: input.scoreTeamA,
				scoreTeamB: input.scoreTeamB,
				winnerId: input.winnerId,
				status: isCompleting ? 'COMPLETED' : 'LIVE',
				startedAt: mapRow.startedAt ?? now,
				completedAt: isCompleting ? now : undefined,
			},
		});

		if (!isCompleting) return null;

		const allMaps = await tx.matchMap.findMany({ where: { matchId } });
		const scoreTeamA = allMaps.filter((m) => m.winnerId === match.teamAId).length;
		const scoreTeamB = allMaps.filter((m) => m.winnerId === match.teamBId).length;

		await tx.matches.update({ where: { id: matchId }, data: { scoreTeamA, scoreTeamB } });

		const bestOf = normalizeBestOf(match.bestOf ?? match.tournament.bestOf);
		const winsNeeded = Math.ceil(bestOf / 2);

		if (scoreTeamA >= winsNeeded) return { winnerId: match.teamAId as number, scoreTeamA, scoreTeamB };
		if (scoreTeamB >= winsNeeded) return { winnerId: match.teamBId as number, scoreTeamA, scoreTeamB };
		return null;
	});

	if (seriesDecision) {
		await recordMatchResult(matchId, seriesDecision);
	}
}
