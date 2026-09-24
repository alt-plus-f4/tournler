import 'server-only';
import { db } from '@/lib/db';
import { getFaceitInfo } from '@/lib/faceit';
import type { PlayerFlair, VerifiedMark } from '@/lib/models/player-flair';

/** Name of the badge the admin "verify" action awards (src/app/api/admin/badges/verify/route.ts). */
export const VERIFIED_BADGE_NAME = 'Verified';

/**
 * Prisma `select` fragment for a user row that needs flair: the linked Steam ID (the FACEIT
 * lookup key) and, if awarded, the Verified badge's own display data. Both are consumed by
 * `attachPlayerFlair` and stripped from the result, so they never reach a public response.
 */
export const playerFlairSelect = {
	steam: { select: { steamId: true } },
	badges: {
		where: { badge: { name: VERIFIED_BADGE_NAME } },
		take: 1,
		select: { badge: { select: { name: true, icon: true, color: true, imageUrl: true } } },
	},
} as const;

type FlairSource = {
	steam: { steamId: string } | null;
	badges: { badge: VerifiedMark }[];
};

/** One FACEIT lookup per unique Steam ID (getFaceitInfo caches each for an hour). */
export async function faceitLevelsBySteamId(steamIds: (string | null | undefined)[]): Promise<Map<string, number | null>> {
	const unique = [...new Set(steamIds.filter((id): id is string => !!id))];
	return new Map(await Promise.all(unique.map(async (id) => [id, (await getFaceitInfo(id))?.level ?? null] as const)));
}

/**
 * Returns a mapper that swaps a user row's raw `steam`/`badges` for the public `verified` and
 * `faceitLevel` fields. `faceitLevel` is only ever a real FACEIT level, never a stand-in.
 */
export async function flairMapper<T extends FlairSource>(users: T[]) {
	const levels = await faceitLevelsBySteamId(users.map((u) => u.steam?.steamId));
	return (user: T): Omit<T, 'steam' | 'badges'> & PlayerFlair => {
		const { steam, badges, ...rest } = user;
		const badge = badges[0]?.badge;
		return {
			...rest,
			verified: badge ? { name: badge.name, icon: badge.icon, color: badge.color, imageUrl: badge.imageUrl } : null,
			faceitLevel: steam ? (levels.get(steam.steamId) ?? null) : null,
		};
	};
}

/** Flair for users you only have ids for (e.g. aggregated stat rows). */
export async function flairByUserId(userIds: string[]): Promise<Map<string, PlayerFlair>> {
	if (userIds.length === 0) return new Map();
	const users = await db.user.findMany({ where: { id: { in: [...new Set(userIds)] } }, select: { id: true, ...playerFlairSelect } });
	const toFlair = await flairMapper(users);
	return new Map(users.map((u) => {
		const { verified, faceitLevel } = toFlair(u);
		return [u.id, { verified, faceitLevel }];
	}));
}
