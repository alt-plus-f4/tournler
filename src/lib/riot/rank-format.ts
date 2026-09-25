/** Client-safe: no Riot API key, just the shape and display of a ranked standing. */
export interface LolRank {
	tier: string;
	/** "I"–"IV", or "" for the apex tiers (Master/Grandmaster/Challenger have no divisions). */
	division: string;
	leaguePoints: number;
	wins: number;
	losses: number;
}

const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

/** "Gold II" / "Challenger" — the same shape as the in-client rank badge. */
export function formatLolRank(rank: LolRank): string {
	const tier = rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase();
	return APEX_TIERS.has(rank.tier) ? tier : `${tier} ${rank.division}`;
}
