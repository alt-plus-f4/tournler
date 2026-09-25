import 'server-only';
import { cachedQuery } from '@/lib/cache/cached-query';
import { getLeagueEntriesByPuuid, riotApiConfigured, RiotApiError } from './client';
import type { RiotPlatform } from './regions';
import type { LolRank } from './rank-format';

export type { LolRank } from './rank-format';
export { formatLolRank } from './rank-format';

/** A failure worth retrying (rate limit, 5xx, network, bad key): thrown so the data cache doesn't store it. */
class RankLookupError extends Error {}

/**
 * The League-V4 request itself, in Next's data cache for an hour per (platform, PUUID). Only
 * definitive answers are cached: a solo/duo rank, or null for "unranked" — same rule as
 * getFaceitInfo.
 */
const lookupLolRank = cachedQuery(
	async (platform: RiotPlatform, puuid: string): Promise<LolRank | null> => {
		let entries;
		try {
			entries = await getLeagueEntriesByPuuid(platform, puuid);
		} catch (error) {
			if (error instanceof RiotApiError && error.kind === 'not_found') return null;
			throw new RankLookupError(`Riot league lookup failed: ${error instanceof Error ? error.message : String(error)}`);
		}
		const solo = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5');
		if (!solo) return null;
		return { tier: solo.tier, division: solo.rank, leaguePoints: solo.leaguePoints, wins: solo.wins, losses: solo.losses };
	},
	['riot-rank'],
	{ tags: ['riot-rank'], revalidate: 3600 },
);

/**
 * A verified player's current ranked solo/duo standing (tier, division, LP) via League-V4 —
 * the LoL profile's equivalent of the CS2 section's FACEIT level.
 *
 * Enrichment, not critical path: never throws — null if the Riot API isn't configured, the player
 * is unranked, or the request fails for any other reason.
 */
export async function getLolRank(platform: RiotPlatform, puuid: string): Promise<LolRank | null> {
	if (!riotApiConfigured()) return null;
	try {
		return await lookupLolRank(platform, puuid);
	} catch (error) {
		console.error('LoL rank lookup failed:', error);
		return null;
	}
}
