import 'server-only';
import { accountRegionalFor, type RiotPlatform } from './regions';

/**
 * Minimal Riot Games API client (server-only; the key never reaches the browser).
 * - account-v1 resolves a Riot ID (gameName#tagLine) to its PUUID.
 * - summoner-v4 reads the League summoner's current profile icon (the ownership check).
 * Every failure is a typed RiotApiError so routes can map it to an honest HTTP status.
 */

export type RiotErrorKind =
	/** RIOT_API_KEY is not set on this server. */
	| 'not_configured'
	/** No such Riot ID / no LoL summoner on that platform. */
	| 'not_found'
	/** The key was rejected (401/403): dev keys expire every 24h. */
	| 'bad_key'
	/** 429 from Riot; retryAfter is in seconds when Riot sent it. */
	| 'rate_limited'
	| 'timeout'
	/** Network failure, 5xx, or a response we couldn't read. */
	| 'upstream';

export class RiotApiError extends Error {
	constructor(
		readonly kind: RiotErrorKind,
		message: string,
		readonly retryAfter?: number,
	) {
		super(message);
		this.name = 'RiotApiError';
	}
}

export const RIOT_TIMEOUT_MS = 5000;

export function riotApiConfigured(): boolean {
	return Boolean(process.env.RIOT_API_KEY);
}

async function riotGet<T>(url: string): Promise<T> {
	const key = process.env.RIOT_API_KEY;
	if (!key) throw new RiotApiError('not_configured', 'Riot ID linking isn’t set up on this server yet.');

	let response: Response;
	try {
		response = await fetch(url, { headers: { 'X-Riot-Token': key }, cache: 'no-store', signal: AbortSignal.timeout(RIOT_TIMEOUT_MS) });
	} catch (error) {
		const name = error instanceof Error ? error.name : '';
		if (name === 'TimeoutError' || name === 'AbortError') throw new RiotApiError('timeout', 'Riot’s servers didn’t answer in time. Try again.');
		throw new RiotApiError('upstream', 'Couldn’t reach Riot’s servers. Try again.');
	}

	if (response.ok) {
		try {
			return (await response.json()) as T;
		} catch {
			throw new RiotApiError('upstream', 'Riot sent a response we couldn’t read. Try again.');
		}
	}
	if (response.status === 404) throw new RiotApiError('not_found', 'Not found on Riot’s servers.');
	if (response.status === 401 || response.status === 403) throw new RiotApiError('bad_key', 'This server’s Riot API key was rejected.');
	if (response.status === 429) {
		const header = Number(response.headers.get('Retry-After'));
		const retryAfter = Number.isFinite(header) && header > 0 ? header : undefined;
		throw new RiotApiError('rate_limited', 'Riot is rate-limiting lookups right now. Try again shortly.', retryAfter);
	}
	throw new RiotApiError('upstream', `Riot responded ${response.status}.`);
}

export interface RiotAccountDto {
	puuid: string;
	gameName: string;
	tagLine: string;
}

/** account-v1 by Riot ID. Returns Riot's canonical casing of gameName/tagLine. */
export async function getAccountByRiotId(gameName: string, tagLine: string, platform: RiotPlatform): Promise<RiotAccountDto> {
	const host = `https://${accountRegionalFor(platform)}.api.riotgames.com`;
	const data = await riotGet<Partial<RiotAccountDto>>(`${host}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
	if (typeof data.puuid !== 'string' || !data.puuid) throw new RiotApiError('upstream', 'Riot didn’t return an account id.');
	return { puuid: data.puuid, gameName: data.gameName ?? gameName, tagLine: data.tagLine ?? tagLine };
}

export interface SummonerDto {
	puuid: string;
	profileIconId: number;
	summonerLevel?: number;
}

/** summoner-v4 by PUUID on one platform (404 = the Riot account has no LoL summoner there). */
export async function getSummonerByPuuid(platform: RiotPlatform, puuid: string): Promise<SummonerDto> {
	const data = await riotGet<Partial<SummonerDto>>(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`);
	if (typeof data.profileIconId !== 'number') throw new RiotApiError('upstream', 'Riot didn’t return a profile icon.');
	return { puuid: data.puuid ?? puuid, profileIconId: data.profileIconId, summonerLevel: data.summonerLevel };
}

// Data Dragon (Riot's public static CDN, no key). The latest version is needed to build icon URLs;
// held in memory for 6 hours per server instance. Failure just means "show the number, no image".
const DDRAGON_TTL_MS = 6 * 60 * 60 * 1000;
let ddragon: { version: string; at: number } | null = null;

export async function getDataDragonVersion(): Promise<string | null> {
	if (ddragon && Date.now() - ddragon.at < DDRAGON_TTL_MS) return ddragon.version;
	try {
		const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { cache: 'no-store', signal: AbortSignal.timeout(RIOT_TIMEOUT_MS) });
		if (!res.ok) return ddragon?.version ?? null;
		const versions = (await res.json()) as unknown;
		const latest = Array.isArray(versions) && typeof versions[0] === 'string' ? versions[0] : null;
		if (latest && /^[\d.]+$/.test(latest)) ddragon = { version: latest, at: Date.now() };
		return ddragon?.version ?? null;
	} catch {
		return ddragon?.version ?? null;
	}
}

export function profileIconUrl(version: string, iconId: number): string {
	return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

/** Test hook: forget the cached Data Dragon version. */
export function __resetDataDragonCache() {
	ddragon = null;
}
