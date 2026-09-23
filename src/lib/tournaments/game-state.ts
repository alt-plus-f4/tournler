import { MatchSlot } from '@prisma/client';
import { db } from '@/lib/db';
import { recordMatchResult } from './bracket-advancement';
import { recordMapResult } from './map-advancement';
import { upsertPlayerMatchStats, PlayerStatInput } from './player-stats';

export interface GameStateUpdate {
	matchId: number;
	// Present whenever this update is one specific map's result within a series (MatchMap.order) —
	// true for pickups too now (they go through veto and get real MatchMap rows, see
	// finalizeVeto). Absent only for legacy matches with no MatchMap rows at all, which still
	// write the aggregate Matches score directly.
	mapOrder?: number;
	teamAScore: number;
	teamBScore: number;
	isCompleted: boolean;
	// Non-pickup matches only — see recordMatchResult's MatchResultInput.
	winnerId?: number;
	// Pickup matches only — which side won (pickups have no Cs2Team to use as winnerId).
	winnerSide?: MatchSlot;
	playerStats?: PlayerStatInput[];
}

export function isValidPlayerStats(value: unknown): value is PlayerStatInput[] {
	if (!Array.isArray(value)) return false;
	return value.every((entry) => {
		if (!entry || typeof entry !== 'object') return false;
		const e = entry as Record<string, unknown>;
		if (typeof e.userId !== 'string' || typeof e.kills !== 'number' || typeof e.deaths !== 'number' || typeof e.assists !== 'number') return false;
		// Real matches identify the player's team via teamId (a Cs2Team id); pickups have no
		// Cs2Team, so they use side instead (see Matches.winnerSide for the same distinction).
		// Exactly one of the two is expected, but only presence/type is validated here.
		if (e.teamId !== undefined && typeof e.teamId !== 'number') return false;
		if (e.side !== undefined && e.side !== 'TEAM_A' && e.side !== 'TEAM_B') return false;
		if (e.teamId === undefined && e.side === undefined) return false;
		return true;
	});
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
	if (data.winnerSide !== undefined && data.winnerSide !== 'TEAM_A' && data.winnerSide !== 'TEAM_B') return false;
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
			winnerSide: update.isCompleted ? update.winnerSide : undefined,
		});
	} else {
		await recordMatchResult(update.matchId, {
			scoreTeamA: update.teamAScore,
			scoreTeamB: update.teamBScore,
			winnerId: update.isCompleted ? update.winnerId : undefined,
			winnerSide: update.isCompleted ? update.winnerSide : undefined,
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
