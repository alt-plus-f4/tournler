import 'server-only';
import { unstable_cache } from 'next/cache';
import type { CacheTag } from './tags';

// unstable_cache stores results as JSON, which would silently turn Prisma Date objects into
// strings (breaking every `.toISOString()` / date math in pages). Dates are tagged on the way in
// and revived on the way out, so cached queries return exactly what the raw query returned.
const DATE_KEY = '$date';

function encode(value: unknown): unknown {
	if (value instanceof Date) return { [DATE_KEY]: value.toISOString() };
	if (Array.isArray(value)) return value.map(encode);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = encode(v);
		return out;
	}
	return value;
}

function decode(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(decode);
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj);
		if (keys.length === 1 && keys[0] === DATE_KEY && typeof obj[DATE_KEY] === 'string') return new Date(obj[DATE_KEY] as string);
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) out[k] = decode(v);
		return out;
	}
	return value;
}

/** Seconds. Fallback freshness if an invalidation is ever missed; tags handle the normal case. */
export const REVALIDATE = {
	/** Live match state (home "on air", up next, match lists). */
	live: 15,
	/** Lists and detail pages. */
	standard: 60,
	/** Rarely-changing config (homepage settings, forum/news indexes are tagged anyway). */
	slow: 300,
} as const;

/**
 * Cache a server-side query in Next's data cache (shared across requests and serverless
 * instances), tagged by the data domains it reads, with a time-based safety net.
 * Arguments must be JSON-serializable: they become part of the cache key.
 */
export function cachedQuery<Args extends unknown[], Result>(
	fn: (...args: Args) => Promise<Result>,
	keyParts: string[],
	options: { tags: CacheTag[]; revalidate: number },
): (...args: Args) => Promise<Result> {
	const cached = unstable_cache(async (...args: Args) => encode(await fn(...args)), keyParts, options);
	return async (...args: Args) => decode(await cached(...args)) as Result;
}
