/**
 * Per-user attempt limiter for Riot ID link/verify calls (each attempt spends Riot API quota).
 * Sliding window, in memory: it holds per server instance, which is enough to stop a player
 * hammering the button; a determined abuser across serverless instances still meets Riot's own
 * key-level 429s, which the client maps to an honest "try again shortly".
 */
export const RIOT_ATTEMPT_LIMIT = 10;
export const RIOT_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, number[]>();

/** Records an attempt. Returns null if allowed, or the seconds until the next one is. */
export function takeRiotAttempt(userId: string, now: number = Date.now()): number | null {
	const recent = (attempts.get(userId) ?? []).filter((t) => now - t < RIOT_ATTEMPT_WINDOW_MS);
	if (recent.length >= RIOT_ATTEMPT_LIMIT) {
		attempts.set(userId, recent);
		return Math.max(1, Math.ceil((recent[0] + RIOT_ATTEMPT_WINDOW_MS - now) / 1000));
	}
	recent.push(now);
	attempts.set(userId, recent);
	// Keep the map from growing without bound on a long-lived instance.
	if (attempts.size > 5000) {
		for (const [key, times] of attempts) if (times.every((t) => now - t >= RIOT_ATTEMPT_WINDOW_MS)) attempts.delete(key);
	}
	return null;
}

/** Test hook. */
export function __resetRiotAttempts() {
	attempts.clear();
}
