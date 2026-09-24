import { cache } from 'react';
import { db } from '@/lib/db';
import { getFaceitInfo } from '@/lib/faceit';
import { computePlayerCareerStats, getPlayerRecentMatches } from '@/lib/tournaments/player-stats';

// Same public projection GET /api/users/[slug] returns.
const PUBLIC_USER_SELECT = {
	id: true,
	name: true,
	bio: true,
	image: true,
	steam: { select: { steamId: true, createdAt: true } },
	discord: { select: { discordId: true } },
	cs2Team: { select: { id: true, name: true, logo: true } },
	badges: {
		orderBy: { awardedAt: 'desc' },
		select: {
			awardedAt: true,
			badge: { select: { id: true, name: true, description: true, icon: true, color: true, isOverlay: true, imageUrl: true } },
		},
	},
	createdAt: true,
} as const;

/**
 * The profile's user row, looked up like GET /api/users/[slug]: user id first, then a
 * case-insensitive name. React-cached, so the segment layout's generateMetadata and the page
 * share one lookup per request.
 */
export const getProfileUser = cache(async (slug: string) => {
	return (
		(await db.user.findUnique({ where: { id: slug }, select: PUBLIC_USER_SELECT })) ??
		(await db.user.findFirst({ where: { name: { equals: slug, mode: 'insensitive' } }, select: PUBLIC_USER_SELECT }))
	);
});

export type ProfileUser = NonNullable<Awaited<ReturnType<typeof getProfileUser>>>;

/** Career stats, the last 20 matches and the real FACEIT level (external API, cached an hour by fetch). */
export function loadProfileExtras(user: ProfileUser) {
	return Promise.all([computePlayerCareerStats(user.id), getPlayerRecentMatches(user.id, 20), user.steam ? getFaceitInfo(user.steam.steamId) : Promise.resolve(null)]);
}
