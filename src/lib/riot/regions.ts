/**
 * League of Legends platform routing values (what RiotAccount.region stores) and the regional
 * cluster each one belongs to. Client-safe: the region picker and the API's validation share it.
 */
export const RIOT_PLATFORMS = [
	{ id: 'euw1', label: 'EUW', name: 'Europe West', regional: 'europe' },
	{ id: 'eun1', label: 'EUNE', name: 'Europe Nordic & East', regional: 'europe' },
	{ id: 'tr1', label: 'TR', name: 'Türkiye', regional: 'europe' },
	{ id: 'ru', label: 'RU', name: 'Russia', regional: 'europe' },
	{ id: 'me1', label: 'ME', name: 'Middle East', regional: 'europe' },
	{ id: 'na1', label: 'NA', name: 'North America', regional: 'americas' },
	{ id: 'br1', label: 'BR', name: 'Brazil', regional: 'americas' },
	{ id: 'la1', label: 'LAN', name: 'Latin America North', regional: 'americas' },
	{ id: 'la2', label: 'LAS', name: 'Latin America South', regional: 'americas' },
	{ id: 'kr', label: 'KR', name: 'Korea', regional: 'asia' },
	{ id: 'jp1', label: 'JP', name: 'Japan', regional: 'asia' },
	{ id: 'oc1', label: 'OCE', name: 'Oceania', regional: 'sea' },
	{ id: 'ph2', label: 'PH', name: 'Philippines', regional: 'sea' },
	{ id: 'sg2', label: 'SG', name: 'Singapore', regional: 'sea' },
	{ id: 'th2', label: 'TH', name: 'Thailand', regional: 'sea' },
	{ id: 'tw2', label: 'TW', name: 'Taiwan', regional: 'sea' },
	{ id: 'vn2', label: 'VN', name: 'Vietnam', regional: 'sea' },
] as const;

export type RiotPlatform = (typeof RIOT_PLATFORMS)[number]['id'];
export type RiotRegional = (typeof RIOT_PLATFORMS)[number]['regional'];

export const RIOT_PLATFORM_IDS = RIOT_PLATFORMS.map((p) => p.id) as [RiotPlatform, ...RiotPlatform[]];

export function isRiotPlatform(value: string): value is RiotPlatform {
	return (RIOT_PLATFORM_IDS as readonly string[]).includes(value);
}

/** The regional cluster a platform's match/league data lives in (americas / europe / asia / sea). */
export function regionalFor(platform: RiotPlatform): RiotRegional {
	return RIOT_PLATFORMS.find((p) => p.id === platform)!.regional;
}

/**
 * account-v1 is only served from americas / europe / asia (any of them answers for every account);
 * SEA platforms use asia, the nearest cluster.
 */
export function accountRegionalFor(platform: RiotPlatform): 'americas' | 'europe' | 'asia' {
	const regional = regionalFor(platform);
	return regional === 'sea' ? 'asia' : regional;
}

/** "euw1" → "EUW"; unknown values are shown uppercased. */
export function platformLabel(platform: string): string {
	return RIOT_PLATFORMS.find((p) => p.id === platform)?.label ?? platform.toUpperCase();
}
