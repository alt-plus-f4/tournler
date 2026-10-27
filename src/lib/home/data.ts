import 'server-only';
import { cache } from 'react';
import { TournamentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { recentForumThreads } from '@/components/forum/forum-queries';
import { computeRanking, weekRange } from './standings';

// Homepage queries shared by every layout. Each is a Next data-cache entry tagged by the data
// domains it reads (src/lib/cache), so any write to those models refreshes it at once; the
// REVALIDATE tier is only the safety net. Queries only run when a layout actually renders them.

/** Memoized per request; the layout switch and the blocks all read the same row. */
export const getHomepageSettings = cache(cachedQuery(async () => db.homepageSettings.findUnique({ where: { id: 1 } }), ['home-settings'], { tags: ['homepage'], revalidate: REVALIDATE.slow }));

// UPCOMING tournaments whose start date has passed are still shown (the cards label them
// "Start pending"), since the organizer hasn't started or cancelled them yet.
const activeTournament = { status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } };

export const getCuratedFeaturedTournaments = cachedQuery(
	async () =>
		db.cs2Tournament.findMany({
			where: { isSystem: false, isFeatured: true, ...activeTournament },
			orderBy: [{ featuredOrder: 'asc' }, { prizePool: 'desc' }],
			take: 6,
			include: { teams: true },
		}),
	['home-featured-tournaments-curated'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

export const getFallbackFeaturedTournaments = cachedQuery(
	async () =>
		db.cs2Tournament.findMany({
			where: { isSystem: false, ...activeTournament },
			orderBy: { prizePool: 'desc' },
			take: 6,
			include: { teams: true },
		}),
	['home-featured-tournaments-fallback'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

export const getFeaturedNews = cachedQuery(
	async () =>
		db.newsPost.findMany({
			where: { isFeatured: true },
			orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
			take: 6,
		}),
	['home-featured-news'],
	{ tags: ['news', 'homepage'], revalidate: REVALIDATE.standard },
);

export const UPCOMING_COUNT = 3;

// Compares startDate against the fill time, so it stays on the live window (<=15s drift).
export const getUpcomingTournaments = cachedQuery(
	async () => {
		const now = new Date();
		const upcomingFuture = await db.cs2Tournament.findMany({
			where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { gte: now } },
			orderBy: { startDate: 'asc' },
			take: UPCOMING_COUNT,
			include: { teams: true },
		});

		// Genuinely upcoming first (soonest first); top up with overdue ones (most recently due first).
		return upcomingFuture.length >= UPCOMING_COUNT
			? upcomingFuture
			: [
					...upcomingFuture,
					...(await db.cs2Tournament.findMany({
						where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { lt: now } },
						orderBy: { startDate: 'desc' },
						take: UPCOMING_COUNT - upcomingFuture.length,
						include: { teams: true },
					})),
				];
	},
	['home-upcoming-tournaments'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.live },
);

// Only the homepage block's query; forum pages have their own loaders.
export const getRecentForumThreads = cachedQuery(async (take: number) => recentForumThreads(take), ['home-recent-forum-threads'], {
	tags: ['forum'],
	revalidate: REVALIDATE.standard,
});

/**
 * The tournament the season/banner layouts lead with: the soonest tournament that has not started,
 * else one in progress, else the most recently overdue UPCOMING one. `registered` is the number of
 * teams in it, against `teamCapacity`. Null when there is nothing active at all.
 */
export const getSeasonTournament = cachedQuery(
	async () => {
		const now = new Date();
		const select = {
			id: true,
			name: true,
			startDate: true,
			bannerUrl: true,
			prizePool: true,
			teamCapacity: true,
			location: true,
			status: true,
			game: true,
			format: true,
			_count: { select: { teams: true } },
		} as const;
		const where = { isSystem: false };
		const row =
			(await db.cs2Tournament.findFirst({ where: { ...where, status: TournamentStatus.UPCOMING, startDate: { gte: now } }, orderBy: { startDate: 'asc' }, select })) ??
			(await db.cs2Tournament.findFirst({ where: { ...where, status: TournamentStatus.ONGOING }, orderBy: { startDate: 'desc' }, select })) ??
			(await db.cs2Tournament.findFirst({ where: { ...where, status: TournamentStatus.UPCOMING, startDate: { lt: now } }, orderBy: { startDate: 'desc' }, select }));
		if (!row) return null;
		const { _count, ...tournament } = row;
		return { ...tournament, registered: _count.teams };
	},
	['home-season-tournament'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.live },
);

export type SeasonTournament = NonNullable<Awaited<ReturnType<typeof getSeasonTournament>>>;

/**
 * Team ranking from completed team matches (3 points per win, see computeRanking). Reads the
 * minimal columns of every completed non-pickup match outside system tournaments and aggregates in
 * memory; fine at school-league volume, and cached so a hit costs nothing.
 */
export const getTeamRanking = cachedQuery(
	async () => {
		const teamSelect = { select: { id: true, name: true, logo: true } } as const;
		const matches = await db.matches.findMany({
			where: { status: 'COMPLETED', isPickup: false, teamAId: { not: null }, teamBId: { not: null }, tournament: { isSystem: false } },
			select: { winnerId: true, scoreTeamA: true, scoreTeamB: true, teamA: teamSelect, teamB: teamSelect },
		});
		return computeRanking(matches);
	},
	['home-team-ranking'],
	{ tags: ['matches', 'teams', 'tournaments'], revalidate: REVALIDATE.standard },
);

/** Real totals for the stat strip. Players = users on a team or who finished onboarding. */
export const getHomeStats = cachedQuery(
	async () => {
		const [teams, players, tournaments, matches] = await Promise.all([
			db.cs2Team.count(),
			db.user.count({ where: { OR: [{ isOnboardingCompleted: true }, { teams: { some: {} } }] } }),
			db.cs2Tournament.count({ where: { isSystem: false } }),
			db.matches.count({ where: { status: 'COMPLETED', isPickup: false, tournament: { isSystem: false } } }),
		]);
		return { teams, players, tournaments, matches };
	},
	['home-stats'],
	{ tags: ['teams', 'users', 'tournaments', 'matches'], revalidate: REVALIDATE.standard },
);

/**
 * Team matches scheduled in the UTC week (Monday..Sunday) that starts at `weekStartIso`. The start is
 * an argument so the cache key rolls over each week while the page stays free of request data.
 */
export const getWeekMatches = cachedQuery(
	async (weekStartIso: string) => {
		const { start, end } = weekRange(new Date(weekStartIso));
		const teamSelect = { select: { name: true, logo: true } } as const;
		return db.matches.findMany({
			where: { isPickup: false, matchDate: { gte: start, lt: end }, tournament: { isSystem: false } },
			orderBy: [{ matchDate: 'asc' }, { id: 'asc' }],
			take: 80,
			select: {
				id: true,
				matchDate: true,
				status: true,
				scoreTeamA: true,
				scoreTeamB: true,
				tournament: { select: { name: true, game: true } },
				teamA: teamSelect,
				teamB: teamSelect,
			},
		});
	},
	['home-week-matches'],
	{ tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live },
);

export type WeekMatch = Awaited<ReturnType<typeof getWeekMatches>>[number];

/** Convenience for the blocks: this week's matches with the week start derived from now. */
export async function getCurrentWeekMatches(now: Date = new Date()) {
	return getWeekMatches(weekRange(now).start.toISOString());
}
