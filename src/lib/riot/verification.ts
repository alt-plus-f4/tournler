/**
 * Riot ID ownership check (pure logic, no I/O): the player sets a specific base profile icon in the
 * League client, then we read their summoner's current icon from Riot. Icons 0–28 are the free
 * starter icons every account owns, so any player can complete the challenge.
 */

export const BASE_ICON_MIN = 0;
export const BASE_ICON_MAX = 28;
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

/**
 * A random base icon that differs from the one the player already has (and from the previous
 * challenge, so "pick another icon" actually changes it). `random` is injectable for tests.
 */
export function pickChallengeIcon(exclude: Array<number | null | undefined>, random: () => number = Math.random): number {
	const excluded = new Set(exclude.filter((n): n is number => typeof n === 'number'));
	const pool: number[] = [];
	for (let id = BASE_ICON_MIN; id <= BASE_ICON_MAX; id++) if (!excluded.has(id)) pool.push(id);
	return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export interface ChallengeState {
	verificationIconId: number | null;
	verificationExpiresAt: Date | null;
	verifiedAt: Date | null;
}

export type VerifyOutcome =
	| { result: 'verified' }
	| { result: 'already_verified' }
	| { result: 'no_challenge' }
	| { result: 'expired' }
	| { result: 'mismatch'; expectedIconId: number; currentIconId: number };

/** Decide a verify attempt. The expiry is checked first, before Riot is even asked. */
export function checkChallengeOpen(state: ChallengeState, now: Date): Exclude<VerifyOutcome, { result: 'verified' } | { result: 'mismatch' }> | null {
	if (state.verifiedAt && state.verificationIconId === null) return { result: 'already_verified' };
	if (state.verificationIconId === null || !state.verificationExpiresAt) return { result: 'no_challenge' };
	if (state.verificationExpiresAt.getTime() <= now.getTime()) return { result: 'expired' };
	return null;
}

export function evaluateVerification(state: ChallengeState, currentIconId: number, now: Date): VerifyOutcome {
	const closed = checkChallengeOpen(state, now);
	if (closed) return closed;
	const expected = state.verificationIconId as number;
	return currentIconId === expected ? { result: 'verified' } : { result: 'mismatch', expectedIconId: expected, currentIconId };
}
