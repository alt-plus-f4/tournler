import { z } from 'zod';

/** Framework-free vote helpers (safe to import from server, client and tests). */

export type VoteValue = -1 | 0 | 1;

/** Request body for the vote endpoints: 1 = upvote, -1 = downvote, 0 = remove the vote. */
export const voteSchema = z.object({
	value: z.union([z.literal(1), z.literal(-1), z.literal(0)], { errorMap: () => ({ message: 'Vote must be 1, -1 or 0' }) }),
});

/** Vote changes allowed per user per rolling minute. */
export const VOTE_RATE_LIMIT = 30;
export const VOTE_RATE_WINDOW_MS = 60_000;

/** How much a switch from `previous` to `next` moves the net score (e.g. up → down is -2). */
export function voteDelta(previous: VoteValue, next: VoteValue): number {
	return next - previous;
}

/** What clicking an arrow means: clicking the arrow you already chose removes the vote, otherwise it switches to it. */
export function nextVote(current: VoteValue, clicked: 1 | -1): VoteValue {
	return current === clicked ? 0 : clicked;
}

export function toVoteValue(value: number | null | undefined): VoteValue {
	return value === 1 ? 1 : value === -1 ? -1 : 0;
}

/** Score as shown in readouts: a true minus sign for negatives so the column aligns. */
export function formatScore(score: number): string {
	return score < 0 ? `−${Math.abs(score)}` : String(score);
}

/**
 * The write a vote change needs, given the stored row (or none). `null` means nothing changes.
 * Kept pure so the transaction in the route only executes the plan.
 */
export type VotePlan = { kind: 'create'; value: 1 | -1; delta: number } | { kind: 'update'; value: 1 | -1; delta: number } | { kind: 'delete'; delta: number } | null;

export function planVote(existing: VoteValue, next: VoteValue): VotePlan {
	if (existing === next) return null;
	const delta = voteDelta(existing, next);
	if (next === 0) return { kind: 'delete', delta };
	return existing === 0 ? { kind: 'create', value: next, delta } : { kind: 'update', value: next, delta };
}
