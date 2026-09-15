export interface FaceitInfo {
	level: number; // 1-10, FACEIT's own CS2 skill level
	elo: number;
	faceitUrl: string | null;
}

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
	const apiKey = process.env.FACEIT_API_KEY;
	if (!apiKey) return null;

	try {
		const url = `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${encodeURIComponent(steamId64)}`;
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${apiKey}` },
			next: { revalidate: 3600 }, // FACEIT level/Elo don't need to be fetched fresh on every profile view
		});

		if (!response.ok) return null; // 404 = no FACEIT account linked to this Steam ID for CS2

		const data = await response.json();
		const cs2 = data?.games?.cs2;
		if (!cs2 || typeof cs2.skill_level !== 'number') return null;

		return {
			level: cs2.skill_level,
			elo: typeof cs2.faceit_elo === 'number' ? cs2.faceit_elo : 0,
			faceitUrl: typeof data.nickname === 'string' ? `https://www.faceit.com/en/players/${data.nickname}` : null,
		};
	} catch (error) {
		console.error('Failed to fetch FACEIT info:', error);
		return null;
	}
}
