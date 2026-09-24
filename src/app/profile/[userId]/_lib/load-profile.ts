import { cache } from 'react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
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
 * case-insensitive name. Public data only (the "is this me" check stays in the page), so it lives
 * in the shared data cache; a null (not found) result is cached too and flushed by any user write.
 * React-cached on top, so the segment layout's generateMetadata and the page share one lookup.
 */
const loadProfileUser = cachedQuery(
	async (slug: string) =>
		(await db.user.findUnique({ where: { id: slug }, select: PUBLIC_USER_SELECT })) ??
		(await db.user.findFirst({ where: { name: { equals: slug, mode: 'insensitive' } }, select: PUBLIC_USER_SELECT })),
	['profile-user'],
	{ tags: ['users', 'teams'], revalidate: REVALIDATE.standard },
);

export const getProfileUser = cache((slug: string) => loadProfileUser(slug));

export type ProfileUser = NonNullable<Awaited<ReturnType<typeof getProfileUser>>>;

const RECENT_MATCHES = 20;

// Stat rows join matches, tournaments and team names.
const PLAYER_STATS_TAGS = ['matches', 'tournaments', 'teams', 'users'] as const;

const loadCareerStats = cachedQuery((userId: string) => computePlayerCareerStats(userId), ['profile-career-stats'], {
	tags: [...PLAYER_STATS_TAGS],
	revalidate: REVALIDATE.standard,
});

const loadRecentMatches = cachedQuery((userId: string) => getPlayerRecentMatches(userId, RECENT_MATCHES), ['profile-recent-matches', String(RECENT_MATCHES)], {
	tags: [...PLAYER_STATS_TAGS],
	revalidate: REVALIDATE.standard,
});

/** Career stats, the last 20 matches and the real FACEIT level (external API; getFaceitInfo caches it an hour). */
export function loadProfileExtras(user: ProfileUser) {
	return Promise.all([loadCareerStats(user.id), loadRecentMatches(user.id), user.steam ? getFaceitInfo(user.steam.steamId) : Promise.resolve(null)]);
}
