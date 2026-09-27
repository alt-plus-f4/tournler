/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

import { __resetDataDragonCache, getAccountByRiotId, getDataDragonVersion, getLeagueEntriesByPuuid, getSummonerByPuuid, profileIconUrl, riotApiConfigured, RiotApiError } from '../client';

const originalFetch = global.fetch;
const originalKey = process.env.RIOT_API_KEY;

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
	return {
		ok: (init.status ?? 200) < 300,
		status: init.status ?? 200,
		headers: { get: (name: string) => init.headers?.[name] ?? null },
		json: async () => body,
	} as Response;
}

describe('riot client', () => {
	beforeEach(() => {
		__resetDataDragonCache();
		process.env.RIOT_API_KEY = 'test-key';
	});

	afterEach(() => {
		global.fetch = originalFetch;
		process.env.RIOT_API_KEY = originalKey;
		jest.restoreAllMocks();
	});

	it('riotApiConfigured reflects whether RIOT_API_KEY is set', () => {
		expect(riotApiConfigured()).toBe(true);
		delete process.env.RIOT_API_KEY;
		expect(riotApiConfigured()).toBe(false);
	});

	it('throws not_configured without making a request when the key is missing', async () => {
		delete process.env.RIOT_API_KEY;
		const fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
		await expect(getAccountByRiotId('valkyr', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'not_configured' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('resolves an account by Riot ID, hitting the right regional host and URL-encoding the name', async () => {
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ puuid: 'p-1', gameName: 'val kyr', tagLine: 'EUW' }));
		global.fetch = fetchMock as unknown as typeof fetch;
		const account = await getAccountByRiotId('val kyr', 'EUW', 'euw1');
		expect(account).toEqual({ puuid: 'p-1', gameName: 'val kyr', tagLine: 'EUW' });
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/val%20kyr/EUW');
		expect(init.headers['X-Riot-Token']).toBe('test-key');
	});

	it('maps 404 to a not_found RiotApiError', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 404 })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('nobody', 'NA1', 'na1')).rejects.toThrow(RiotApiError);
		await expect(getAccountByRiotId('nobody', 'NA1', 'na1')).rejects.toMatchObject({ kind: 'not_found' });
	});

	it('maps 401 and 403 to a bad_key RiotApiError', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 401 })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'bad_key' });
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 403 })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'bad_key' });
	});

	it('maps 429 to a rate_limited RiotApiError and reads Retry-After', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 429, headers: { 'Retry-After': '17' } })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'rate_limited', retryAfter: 17 });
	});

	it('leaves retryAfter undefined when Riot sends no Retry-After header', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 429 })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'rate_limited', retryAfter: undefined });
	});

	it('maps an unexpected status to an upstream RiotApiError', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 500 })) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'upstream' });
	});

	it('maps a network failure to an upstream RiotApiError', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'upstream' });
	});

	it('maps an abort/timeout to a timeout RiotApiError', async () => {
		const timeoutError = new Error('timed out');
		timeoutError.name = 'TimeoutError';
		global.fetch = jest.fn().mockRejectedValue(timeoutError) as unknown as typeof fetch;
		await expect(getAccountByRiotId('a', 'EUW', 'euw1')).rejects.toMatchObject({ kind: 'timeout' });
	});

	it('gets a summoner by PUUID on the given platform host', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({ puuid: 'p-1', profileIconId: 4, summonerLevel: 30 })) as unknown as typeof fetch;
		const summoner = await getSummonerByPuuid('euw1', 'p-1');
		expect(summoner).toEqual({ puuid: 'p-1', profileIconId: 4, summonerLevel: 30 });
	});

	it('getSummonerByPuuid propagates a 404 as not_found (no LoL summoner on that platform)', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, { status: 404 })) as unknown as typeof fetch;
		await expect(getSummonerByPuuid('na1', 'p-1')).rejects.toMatchObject({ kind: 'not_found' });
	});

	it('gets the league entries for a summoner by PUUID', async () => {
		const entries = [{ queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 42, wins: 10, losses: 8 }];
		global.fetch = jest.fn().mockResolvedValue(jsonResponse(entries)) as unknown as typeof fetch;
		await expect(getLeagueEntriesByPuuid('euw1', 'p-1')).resolves.toEqual(entries);
	});

	it('getLeagueEntriesByPuuid returns an empty list for an unranked summoner (Riot answers 200, not 404)', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse([])) as unknown as typeof fetch;
		await expect(getLeagueEntriesByPuuid('euw1', 'p-1')).resolves.toEqual([]);
	});

	it('fetches and caches the Data Dragon version, and builds an icon URL from it', async () => {
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(['14.19.1', '14.18.1']));
		global.fetch = fetchMock as unknown as typeof fetch;
		expect(await getDataDragonVersion()).toBe('14.19.1');
		expect(await getDataDragonVersion()).toBe('14.19.1');
		expect(fetchMock).toHaveBeenCalledTimes(1); // second call served from the in-memory cache
		expect(profileIconUrl('14.19.1', 7)).toBe('https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/7.png');
	});

	it('getDataDragonVersion returns null (not a throw) when the CDN is unreachable', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
		await expect(getDataDragonVersion()).resolves.toBeNull();
	});
});
