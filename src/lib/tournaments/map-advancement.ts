import { MatchSlot } from '@prisma/client';
import { db } from '@/lib/db';
import { recordMatchResult, MatchResultConflictError } from './bracket-advancement';
import { normalizeBestOf } from './veto';

export interface MapResultInput {
	scoreTeamA?: number;
	scoreTeamB?: number;
	/** Non-pickup matches only — the winning Cs2Team's id. */
	winnerId?: number;
	/** Pickup matches only — which side won this map (they have no Cs2Team to use as winnerId). */
	winnerSide?: MatchSlot;
}

/**
 * Records a single map's result within a bo1/bo3 series (pickup or bracket — pickups go through
 * veto and get real `MatchMap` rows too now, see `finalizeVeto`). Updates the `MatchMap` row,
 * recomputes the series map-win count onto `Matches.scoreTeamA`/`scoreTeamB`, and — only once one
 * side reaches the series-clinching win count (1 for bo1, 2 for bo3) — calls the existing,
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

		// Same teamId/side split as recordMatchResult — pickups have no Cs2Team to be a winnerId.
		if (match.isPickup) {
			if (input.winnerId !== undefined) {
				throw new Error('Pickup matches have no Cs2Team winner — pass winnerSide instead of winnerId');
			}
		} else {
			if (input.winnerSide !== undefined) {
				throw new Error('winnerSide only applies to pickup matches — pass winnerId instead');
			}
			if (input.winnerId !== undefined && input.winnerId !== match.teamAId && input.winnerId !== match.teamBId) {
				throw new Error('winnerId must be one of the match participants');
			}
		}

		const incomingWinner = match.isPickup ? input.winnerSide : input.winnerId;

		if (mapRow.status === 'COMPLETED') {
			const currentWinner = match.isPickup ? mapRow.winnerSide : mapRow.winnerId;
			if (incomingWinner !== undefined && incomingWinner !== currentWinner) {
				throw new MatchResultConflictError(`Map ${mapOrder} of match ${matchId} is already completed with a different winner`);
			}
			return null;
		}

		const now = new Date();
		const isCompleting = incomingWinner !== undefined;

		await tx.matchMap.update({
			where: { id: mapRow.id },
			data: {
				scoreTeamA: input.scoreTeamA,
				scoreTeamB: input.scoreTeamB,
				winnerId: match.isPickup ? undefined : input.winnerId,
				winnerSide: match.isPickup ? input.winnerSide : undefined,
				status: isCompleting ? 'COMPLETED' : 'LIVE',
				startedAt: mapRow.startedAt ?? now,
				completedAt: isCompleting ? now : undefined,
			},
		});

		if (!isCompleting) return null;

		const allMaps = await tx.matchMap.findMany({ where: { matchId } });
		const scoreTeamA = match.isPickup ? allMaps.filter((m) => m.winnerSide === 'TEAM_A').length : allMaps.filter((m) => m.winnerId === match.teamAId).length;
		const scoreTeamB = match.isPickup ? allMaps.filter((m) => m.winnerSide === 'TEAM_B').length : allMaps.filter((m) => m.winnerId === match.teamBId).length;

		await tx.matches.update({ where: { id: matchId }, data: { scoreTeamA, scoreTeamB } });

		const bestOf = normalizeBestOf(match.bestOf ?? match.tournament.bestOf);
		const winsNeeded = Math.ceil(bestOf / 2);

		if (scoreTeamA >= winsNeeded) return match.isPickup ? { winnerSide: 'TEAM_A' as MatchSlot, scoreTeamA, scoreTeamB } : { winnerId: match.teamAId as number, scoreTeamA, scoreTeamB };
		if (scoreTeamB >= winsNeeded) return match.isPickup ? { winnerSide: 'TEAM_B' as MatchSlot, scoreTeamA, scoreTeamB } : { winnerId: match.teamBId as number, scoreTeamA, scoreTeamB };
		return null;
	});

	if (seriesDecision) {
		await recordMatchResult(matchId, seriesDecision);
	}
}
