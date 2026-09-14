import { db } from '@/lib/db';
import { recordMatchResult } from './bracket-advancement';
import { recordMapResult } from './map-advancement';
import { upsertPlayerMatchStats, PlayerStatInput } from './player-stats';

export interface GameStateUpdate {
	matchId: number;
	// Present for bo1/bo3 series matches with per-map scoring (MatchMap.order); absent for
	// pickup/legacy matches that still write the aggregate Matches score directly.
	mapOrder?: number;
	teamAScore: number;
	teamBScore: number;
	isCompleted: boolean;
	winnerId?: number;
	playerStats?: PlayerStatInput[];
}

export function isValidPlayerStats(value: unknown): value is PlayerStatInput[] {
	if (!Array.isArray(value)) return false;
	return value.every((entry) => entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).userId === 'string' && typeof (entry as Record<string, unknown>).teamId === 'number' && typeof (entry as Record<string, unknown>).kills === 'number' && typeof (entry as Record<string, unknown>).deaths === 'number' && typeof (entry as Record<string, unknown>).assists === 'number');
}

export function isValidGameStateUpdate(payload: unknown): payload is GameStateUpdate {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const data = payload as Record<string, unknown>;
	if (typeof data.matchId !== 'number' || typeof data.teamAScore !== 'number' || typeof data.teamBScore !== 'number' || typeof data.isCompleted !== 'boolean') {
		return false;
	}
	if (data.mapOrder !== undefined && typeof data.mapOrder !== 'number') return false;
	if (data.winnerId !== undefined && typeof data.winnerId !== 'number') return false;
	if (data.playerStats !== undefined && !isValidPlayerStats(data.playerStats)) return false;
	return true;
}

/**
 * Applies an incoming game-state update — either a whole match's aggregate score/winner, or a
 * single map's result within a bo1/bo3 series (when `mapOrder` is present) — and returns the
 * resulting match with teams/winner included. The single write path shared by the direct
 * `/api/matches/game-state` webhook and the MatchZy event adapter
 * (`/api/matches/game-state/matchzy`), so there's exactly one place that owns "what happens
 * when a result arrives" regardless of which producer called it.
 */
export async function applyGameStateUpdate(update: GameStateUpdate) {
	if (update.mapOrder !== undefined) {
		// bo1/bo3 series: this event is one map's result, not the whole series' — recordMapResult
		// only calls recordMatchResult (bracket propagation) once the series is actually decided.
		await recordMapResult(update.matchId, update.mapOrder, {
			scoreTeamA: update.teamAScore,
			scoreTeamB: update.teamBScore,
			winnerId: update.isCompleted ? update.winnerId : undefined,
		});
	} else {
		await recordMatchResult(update.matchId, {
			scoreTeamA: update.teamAScore,
			scoreTeamB: update.teamBScore,
			winnerId: update.isCompleted ? update.winnerId : undefined,
		});
	}

	if (update.playerStats && update.playerStats.length > 0) {
		await upsertPlayerMatchStats(update.matchId, update.playerStats);
	}

	const matchWithTeams = await db.matches.findUnique({
		where: { id: update.matchId },
		include: { teamA: true, teamB: true, winner: true },
	});

	// Only the whole series/match completing (not an individual map within a bo3) frees the
	// game server up for the next match.
	if (matchWithTeams?.status === 'COMPLETED') {
		await db.gameServer.updateMany({
			where: { matchId: update.matchId },
			data: { status: 'COMPLETED' },
		});
	}

	return matchWithTeams;
}
