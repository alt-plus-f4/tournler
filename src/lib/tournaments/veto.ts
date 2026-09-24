import type { DbTx } from '@/lib/db';
import { MapActionType, MatchSlot } from '@prisma/client';
import { ACTIVE_DUTY_MAPS } from './maps';

type Tx = DbTx;

export type VetoAction = 'BAN' | 'PICK';
export type VetoPhase = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

/**
 * Standard competitive CS2 veto conventions. Turn alternates strictly by index parity
 * regardless of action type; the map left over after this sequence is always the auto-recorded
 * DECIDER (never itself part of the sequence array).
 */
export const VETO_SEQUENCES: Record<1 | 3, VetoAction[]> = {
	1: ['BAN', 'BAN', 'BAN', 'BAN', 'BAN', 'BAN'],
	3: ['BAN', 'BAN', 'PICK', 'PICK', 'BAN', 'BAN'],
};

export function normalizeBestOf(bestOf: number | null | undefined): 1 | 3 {
	return bestOf === 3 ? 3 : 1;
}

export interface MatchMapActionLike {
	teamId: number | null;
	// Pickup-match actor (see MatchMapAction.side) — null for non-pickup actions (which use
	// teamId) and for the system-generated DECIDER action either way.
	side: MatchSlot | null;
	action: MapActionType;
	mapName: string;
	order: number;
}

export interface VetoMatchLike {
	isPickup: boolean;
	teamAId: number | null;
	teamBId: number | null;
	bestOf: number | null;
	mapActions: MatchMapActionLike[];
}

export interface VetoState {
	phase: VetoPhase;
	bestOf: 1 | 3;
	sequenceLength: number;
	mapPool: string[];
	availableMaps: string[];
	actions: MatchMapActionLike[];
	// Exactly one of currentTurnTeamId/currentTurnSide is meaningful, matching whether the match
	// is a pickup — see MatchMapAction's own teamId/side split.
	currentTurnTeamId: number | null;
	currentTurnSide: MatchSlot | null;
	nextActionType: VetoAction | null;
	confirmedMaps: string[];
}

/** Effective map pool for a tournament: its configured subset, or every active-duty map if none configured. */
export function resolveMapPool(tournamentMapPool: string[]): string[] {
	return tournamentMapPool.length > 0 ? tournamentMapPool : ACTIVE_DUTY_MAPS.map((m) => m.id);
}

/** Derives veto phase, whose turn it is, and the confirmed map list from a match's recorded actions. Pure/read-only — veto is a sub-state of MatchStatus.SCHEDULED, not a separate status. */
export function getVetoState(match: VetoMatchLike, tournamentMapPool: string[], tournamentBestOf: number): VetoState {
	const bestOf = normalizeBestOf(match.bestOf ?? tournamentBestOf);
	const sequence = VETO_SEQUENCES[bestOf];
	const mapPool = resolveMapPool(tournamentMapPool);

	const actions = [...match.mapActions].sort((a, b) => a.order - b.order);
	const banPickActions = actions.filter((a) => a.action !== 'DECIDER');
	const hasDecider = actions.some((a) => a.action === 'DECIDER');

	const usedMaps = new Set(actions.map((a) => a.mapName));
	const availableMaps = mapPool.filter((m) => !usedMaps.has(m));

	const phase: VetoPhase = hasDecider ? 'COMPLETE' : banPickActions.length === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';

	const nextIndex = banPickActions.length;
	const nextActionType = phase === 'COMPLETE' ? null : (sequence[nextIndex] ?? null);
	const isActing = phase !== 'COMPLETE' && nextActionType !== null;
	// Side/team A always acts first (order parity 0); no coin-flip mechanic for MVP.
	const currentTurnTeamId = !isActing || match.isPickup ? null : nextIndex % 2 === 0 ? match.teamAId : match.teamBId;
	const currentTurnSide: MatchSlot | null = !isActing || !match.isPickup ? null : nextIndex % 2 === 0 ? 'TEAM_A' : 'TEAM_B';

	const confirmedMaps = actions
		.filter((a) => a.action === 'PICK' || a.action === 'DECIDER')
		.map((a) => a.mapName);

	return { phase, bestOf, sequenceLength: sequence.length, mapPool, availableMaps, actions, currentTurnTeamId, currentTurnSide, nextActionType, confirmedMaps };
}

/** The final ordered map list for the series (bo1: one decider map; bo3: pick1, pick2, decider), in play order. */
export function getConfirmedMaps(match: VetoMatchLike): string[] {
	return [...match.mapActions]
		.filter((a) => a.action === 'PICK' || a.action === 'DECIDER')
		.sort((a, b) => a.order - b.order)
		.map((a) => a.mapName);
}

/** Thrown when a veto action is attempted out of turn, on an already-acted map, or after veto has completed. */
export class VetoError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VetoError';
	}
}

/**
 * Called once the last BAN/PICK action in the sequence has been written. Auto-inserts the
 * DECIDER action for the one remaining map, then creates the match's `MatchMap` rows (one per
 * confirmed map) so `recordMapResult`/the game-server pipeline have somewhere to write scores.
 * Idempotent — a no-op if veto is already complete or not yet at the end of its sequence.
 */
export async function finalizeVeto(tx: Tx, matchId: number): Promise<void> {
	const match = await tx.matches.findUniqueOrThrow({
		where: { id: matchId },
		include: { mapActions: true, tournament: true },
	});

	const state = getVetoState(match, match.tournament.mapPool, match.tournament.bestOf);
	if (state.phase === 'COMPLETE') return;
	if (state.actions.filter((a) => a.action !== 'DECIDER').length < state.sequenceLength) return;

	if (state.availableMaps.length !== 1) {
		throw new VetoError(`Expected exactly one remaining map to auto-decide for match ${matchId}, found ${state.availableMaps.length}`);
	}

	const deciderMap = state.availableMaps[0];
	const deciderOrder = state.actions.length;

	await tx.matchMapAction.create({
		data: { matchId, teamId: null, action: 'DECIDER', mapName: deciderMap, order: deciderOrder },
	});

	const confirmedMaps = getConfirmedMaps({
		...match,
		mapActions: [...match.mapActions, { teamId: null, side: null, action: 'DECIDER', mapName: deciderMap, order: deciderOrder }],
	});

	for (let i = 0; i < confirmedMaps.length; i++) {
		await tx.matchMap.upsert({
			where: { matchId_order: { matchId, order: i } },
			create: { matchId, mapName: confirmedMaps[i], order: i },
			update: {},
		});
	}
}
