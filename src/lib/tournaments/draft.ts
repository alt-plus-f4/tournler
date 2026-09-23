import { MatchSlot, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export type DraftPhase = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface DraftParticipantLike {
	userId: string;
	side: MatchSlot;
	isCaptain: boolean;
	joinedAt: Date;
}

export interface DraftPickLike {
	captainSide: MatchSlot;
	pickedUserId: string;
	order: number;
}

// 2 captains + 8 pool players = 10 total for a full 5v5, 4 picks per captain — matches "old FPL",
// not a generic N-a-side draft. A CAPTAIN_DRAFT pickup that never fills all 10 joins just never
// reaches IN_PROGRESS/COMPLETE (same as OPEN pickups sitting under 10 joiners never force-starting).
export const DRAFT_POOL_SIZE = 8;
export const PICKS_PER_CAPTAIN = DRAFT_POOL_SIZE / 2;

export interface DraftState {
	phase: DraftPhase;
	captainAUserId: string | null;
	captainBUserId: string | null;
	// Undrafted pool players, in join order (first-joined picked soonest has no special meaning —
	// order here is just display order, not turn order).
	poolUserIds: string[];
	picks: DraftPickLike[];
	currentTurnSide: MatchSlot | null;
}

/** Thrown when a draft pick is attempted out of turn, on an already-picked/non-pool player, or after the draft has completed. */
export class DraftError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DraftError';
	}
}

/**
 * Derives draft phase, whose turn it is, and the remaining pool from a CAPTAIN_DRAFT pickup's
 * participants + recorded picks. Pure/read-only — the draft is a sub-state of MatchStatus.SCHEDULED,
 * same as veto, not a separate status.
 */
export function getDraftState(participants: DraftParticipantLike[], picks: DraftPickLike[]): DraftState {
	const captainA = participants.find((p) => p.isCaptain && p.side === 'TEAM_A') ?? null;
	const captainB = participants.find((p) => p.isCaptain && p.side === 'TEAM_B') ?? null;
	const poolUserIds = participants
		.filter((p) => p.side === 'POOL')
		.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
		.map((p) => p.userId);

	const sortedPicks = [...picks].sort((a, b) => a.order - b.order);

	// Not enough players joined yet to even start drafting (need both captains present — the pool
	// count only matters for knowing when the draft is *done*, not for starting it: captains can
	// start picking from a partial pool exactly like veto can start before every map's necessarily
	// relevant, since there's always at least one available option to pick from as long as the
	// pool isn't literally empty).
	if (!captainA || !captainB) {
		return { phase: 'NOT_STARTED', captainAUserId: captainA?.userId ?? null, captainBUserId: captainB?.userId ?? null, poolUserIds, picks: sortedPicks, currentTurnSide: null };
	}

	const isComplete = sortedPicks.length >= PICKS_PER_CAPTAIN * 2 || (poolUserIds.length === 0 && sortedPicks.length > 0);
	const phase: DraftPhase = isComplete ? 'COMPLETE' : sortedPicks.length === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';

	// Straight alternating, captain A (TEAM_A) always picks first each round — matches old FPL,
	// not a snake draft.
	const currentTurnSide: MatchSlot | null = phase === 'COMPLETE' || poolUserIds.length === 0 ? null : sortedPicks.length % 2 === 0 ? 'TEAM_A' : 'TEAM_B';

	return { phase, captainAUserId: captainA.userId, captainBUserId: captainB.userId, poolUserIds, picks: sortedPicks, currentTurnSide };
}

/**
 * Records one captain's pick: moves the picked pool player's `MatchParticipant.side` onto the
 * picking captain's side and appends a `MatchDraftPick` row. Caller (the draft API route) is
 * responsible for validating turn order/pool membership against `getDraftState` before calling
 * this — this function just performs the write, atomically.
 */
export async function recordDraftPick(tx: Tx, matchId: number, captainSide: MatchSlot, pickedUserId: string, order: number): Promise<void> {
	await tx.matchParticipant.update({ where: { matchId_userId: { matchId, userId: pickedUserId } }, data: { side: captainSide } });
	await tx.matchDraftPick.create({ data: { matchId, captainSide, pickedUserId, order } });
}
