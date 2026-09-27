import 'server-only';
import { cachedQuery } from '@/lib/cache/cached-query';

export { faceitLevelProgress, type FaceitLevelProgress } from './faceit-level';

export interface FaceitInfo {
	level: number; // 1-10, FACEIT's own CS2 skill level
	elo: number;
	faceitUrl: string | null;
}

/** A failure worth retrying (rate limit, 5xx, network): thrown so the data cache doesn't store it. */
class FaceitLookupError extends Error {}

/**
 * The FACEIT request itself, in Next's data cache (shared across serverless instances) for an hour
 * per Steam ID. Only definitive answers are cached: a level, or null for "no FACEIT CS2 account"
 * (404 / no cs2 game). Anything transient throws, so nothing is stored and the next call retries.
 */
const lookupFaceitInfo = cachedQuery(
	async (steamId64: string): Promise<FaceitInfo | null> => {
		const url = `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${encodeURIComponent(steamId64)}`;
		let response: Response;
		try {
			// no-store: the surrounding cachedQuery is the cache (and decides what gets stored).
			response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }, cache: 'no-store' });
		} catch (error) {
			throw new FaceitLookupError(`FACEIT request failed: ${error instanceof Error ? error.message : String(error)}`);
		}

		if (response.status === 404) return null; // no FACEIT account linked to this Steam ID for CS2
		if (!response.ok) throw new FaceitLookupError(`FACEIT responded ${response.status}`);

		const data = await response.json();
		const cs2 = data?.games?.cs2;
		if (!cs2 || typeof cs2.skill_level !== 'number') return null;

		return {
			level: cs2.skill_level,
			elo: typeof cs2.faceit_elo === 'number' ? cs2.faceit_elo : 0,
			faceitUrl: typeof data.nickname === 'string' ? `https://www.faceit.com/en/players/${data.nickname}` : null,
		};
	},
	['faceit'],
	{ tags: ['faceit'], revalidate: 3600 },
);

/**
 * Looks up a player's real FACEIT CS2 level/Elo by their Steam ID, via FACEIT's official Data API
 * (`open.faceit.com/data/v4` — confirmed directly against its published OpenAPI spec:
 * `GET /players?game=cs2&game_player_id=<steamId64>`, response shape
 * `{ games: { cs2: { skill_level, faceit_elo } } }`). Requires a free server-side API key from
 * https://developers.faceit.com (`FACEIT_API_KEY`) — not the third-party scraper/aggregator sites
 * that turn up when searching for this ("steamcommunity.rip" and similar); those aren't an
 * official or reliably-available data source, and this is.
 *
 * Enrichment, not critical path: never throws — returns null if the key isn't configured, the
 * player has no linked FACEIT account for CS2 (404), or the request fails for any other reason.
 */
export async function getFaceitInfo(steamId64: string): Promise<FaceitInfo | null> {
	if (!process.env.FACEIT_API_KEY) return null;
	try {
		return await lookupFaceitInfo(steamId64);
	} catch (error) {
		console.error('Failed to fetch FACEIT info:', error);
		return null;
	}
}
