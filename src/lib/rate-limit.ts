import 'server-only';

/**
 * In-process fixed-window rate limiter. Deliberately simple: this is a first line of defense
 * against obvious abuse (credential stuffing, a leaked webhook secret, a misconfigured cron),
 * not a precise or distributed limiter.
 *
 * Caveat (see node_modules/next/dist/docs/.../proxy.md, "Good to know"): Proxy "should not attempt
 * relying on shared modules or globals" because it can be deployed separately from the app and run
 * across many isolated instances/regions. This module-level Map is per-instance only — under
 * Fluid Compute it persists across warm invocations of the same instance (so it does throttle a
 * sustained attacker hitting the same instance), but a distributed attacker spread across many
 * instances, or a cold start, resets it. Treat this as best-effort, not a security boundary.
 * For real distributed limiting, move to Vercel Firewall rate-limit rules or an Upstash Redis
 * token bucket shared across instances.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cheap opportunistic cleanup so `buckets` doesn't grow unbounded across many distinct IPs/keys;
// runs at most once per this interval, on whichever request happens to trigger it.
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = 0;

function cleanup(now: number) {
	if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
	lastCleanup = now;
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
}

/**
 * Returns true if `key` is still under `limit` requests within the current `windowMs` window,
 * incrementing its count as a side effect. Returns false (and does not count against future
 * windows) once the limit is exceeded for the rest of the current window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	cleanup(now);

	const existing = buckets.get(key);
	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (existing.count >= limit) return false;

	existing.count += 1;
	return true;
}
