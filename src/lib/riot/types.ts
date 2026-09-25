/** What the owner's UI gets about their Riot ID (client-safe; never includes the PUUID). */
export interface RiotAccountView {
	gameName: string;
	tagLine: string;
	/** Platform routing value, e.g. "euw1". */
	region: string;
	status: 'linked' | 'pending';
	/** The open ownership challenge, if any (pending accounts only). */
	challenge: {
		iconId: number;
		expiresAt: string;
		/** Data Dragon image of the icon, or null when the version lookup failed (show the number only). */
		iconUrl: string | null;
	} | null;
}

/** GET /api/user/riot and the success body of POST /api/user/riot(/verify). */
export interface RiotStatusResponse {
	/** false when RIOT_API_KEY isn't set on this server: linking can't work, and the UI says so. */
	configured: boolean;
	account: RiotAccountView | null;
}

export const RIOT_NOT_CONFIGURED_MESSAGE = 'Riot ID linking isn’t set up on this server yet.';

/** Riot ID shape rules, shared by the form and the API (Riot's own limits). */
export const RIOT_GAME_NAME_MIN = 3;
export const RIOT_GAME_NAME_MAX = 16;
export const RIOT_TAG_LINE_PATTERN = /^[A-Za-z0-9]{3,5}$/;
