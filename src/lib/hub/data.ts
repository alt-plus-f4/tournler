import 'server-only';
import { MatchStatus, TournamentStatus, type Game } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { computeRanking } from '@/lib/home/standings';

// Reads for the site header and the per-game hub overview pages (/cs2, /lol). Same model as
// src/lib/home/data.ts: each is a Next data-cache entry tagged by the domains it reads, so writes
// refresh it at once and REVALIDATE is only the safety net. `game` is a cache-key argument.

const TEAM_SIZE = 5;
const teamSide = { select: { id: true, name: true, logo: true } } as const;

/**
 * The header's per-game status line. Deliberately avoids live-match state: the header is on every
 * page, and the 'matches' tag flushes on every live score update.
 */
export const getNavData = cachedQuery(
	async () => {
		const now = new Date();
		const [teamCounts, openCounts] = await Promise.all([
			db.cs2Team.groupBy({ by: ['game'], _count: { _all: true } }),
			db.cs2Tournament.groupBy({ by: ['game'], where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { gte: now } }, _count: { _all: true } }),
		]);
		const count = (rows: { game: Game; _count: { _all: number } }[], game: Game) => rows.find((r) => r.game === game)?._count._all ?? 0;
		return {
			games: {
				CS2: { teams: count(teamCounts, 'CS2'), openTournaments: count(openCounts, 'CS2') },
				LOL: { teams: count(teamCounts, 'LOL'), openTournaments: count(openCounts, 'LOL') },
			},
		};
	},
	['nav-data'],
	{ tags: ['teams', 'tournaments'], revalidate: REVALIDATE.slow },
);

export type NavData = Awaited<ReturnType<typeof getNavData>>;

/** Live (or paused) team matches of one game, newest start first. */
export const getHubLiveMatches = cachedQuery(
	async (game: Game) =>
		db.matches.findMany({
			where: { isPickup: false, status: { in: [MatchStatus.LIVE, MatchStatus.PAUSED] }, tournament: { game, isSystem: false } },
			orderBy: { matchDate: 'desc' },
			take: 4,
			select: {
				id: true,
				status: true,
				round: true,
				scoreTeamA: true,
				scoreTeamB: true,
				matchDate: true,
				tournament: { select: { id: true, name: true, bannerUrl: true } },
				teamA: teamSide,
				teamB: teamSide,
			},
		}),
	['hub-live-matches'],
	{ tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live },
);

export type HubLiveMatch = Awaited<ReturnType<typeof getHubLiveMatches>>[number];

/** "Up next": the soonest scheduled team matches, topped up with the latest results. */
export const getHubMatchFeed = cachedQuery(
	async (game: Game) => {
		const base = { isPickup: false, tournament: { game, isSystem: false } };
		const select = { id: true, status: true, matchDate: true, scoreTeamA: true, scoreTeamB: true, teamA: teamSide, teamB: teamSide } as const;
		const [upcoming, recent] = await Promise.all([
			db.matches.findMany({ where: { ...base, status: MatchStatus.SCHEDULED, matchDate: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } }, orderBy: { matchDate: 'asc' }, take: 5, select }),
			db.matches.findMany({ where: { ...base, status: MatchStatus.COMPLETED }, orderBy: { matchDate: 'desc' }, take: 3, select }),
		]);
		return [...upcoming, ...recent].slice(0, 6);
	},
	['hub-match-feed'],
	{ tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live },
);

export type HubFeedMatch = Awaited<ReturnType<typeof getHubMatchFeed>>[number];

/** Tournaments of one game still taking teams (UPCOMING, start in the future), soonest first. */
export const getHubOpenTournaments = cachedQuery(
	async (game: Game) => {
		const rows = await db.cs2Tournament.findMany({
			where: { isSystem: false, game, status: TournamentStatus.UPCOMING, startDate: { gte: new Date() } },
			orderBy: { startDate: 'asc' },
			take: 4,
			select: { id: true, name: true, startDate: true, bannerUrl: true, prizePool: true, teamCapacity: true, location: true, bestOf: true, mapPool: true, _count: { select: { teams: true } } },
		});
		return rows.map(({ _count, ...t }) => ({ ...t, registered: _count.teams }));
	},
	['hub-open-tournaments'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

export type HubTournament = Awaited<ReturnType<typeof getHubOpenTournaments>>[number];

/** Per-game team ranking from completed team matches (same points rule as the homepage). */
export const getHubRanking = cachedQuery(
	async (game: Game) => {
		const matches = await db.matches.findMany({
			where: { status: MatchStatus.COMPLETED, isPickup: false, teamAId: { not: null }, teamBId: { not: null }, tournament: { isSystem: false, game } },
			select: { winnerId: true, scoreTeamA: true, scoreTeamB: true, teamA: teamSide, teamB: teamSide },
		});
		return computeRanking(matches).slice(0, 6);
	},
	['hub-team-ranking'],
	{ tags: ['matches', 'teams', 'tournaments'], revalidate: REVALIDATE.standard },
);

/** Most kills across completed team matches of one game, with K/D. Empty until stats exist. */
export const getHubTopPlayers = cachedQuery(
	async (game: Game) => {
		const grouped = await db.playerMatchStat.groupBy({
			by: ['userId'],
			where: { match: { isPickup: false, status: MatchStatus.COMPLETED, tournament: { game, isSystem: false } } },
			_sum: { kills: true, deaths: true },
			_count: { _all: true },
			orderBy: { _sum: { kills: 'desc' } },
			take: 5,
		});
		if (grouped.length === 0) return [];
		const users = await db.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true, image: true } });
		const byId = new Map(users.map((u) => [u.id, u]));
		return grouped.flatMap((g) => {
			const user = byId.get(g.userId);
			if (!user) return [];
			const kills = g._sum.kills ?? 0;
			const deaths = g._sum.deaths ?? 0;
			return [{ ...user, kills, kd: deaths === 0 ? kills : kills / deaths, matches: g._count._all }];
		});
	},
	['hub-top-players'],
	{ tags: ['matches', 'users'], revalidate: REVALIDATE.standard },
);

/** Latest news posts (news isn't tagged by game, so both hubs show the same feed). */
export const getHubNews = cachedQuery(
	async () =>
		db.newsPost.findMany({
			orderBy: { publishedAt: 'desc' },
			take: 3,
			select: { id: true, title: true, imageUrl: true, link: true, content: true, publishedAt: true },
		}),
	['hub-latest-news'],
	{ tags: ['news'], revalidate: REVALIDATE.standard },
);

/** Teams of one game with a free roster slot, in the TeamCard shape the Teams page uses. */
export const getHubOpenTeams = cachedQuery(
	async (game: Game) => {
		const teams = await db.cs2Team.findMany({
			where: { game },
			orderBy: { updatedAt: 'desc' },
			take: 40,
			select: {
				id: true,
				name: true,
				game: true,
				members: { select: { id: true, name: true, image: true, bio: true } },
				capitanId: true,
				logo: true,
				background: true,
				createdAt: true,
				updatedAt: true,
			},
		});
		return teams.filter((t) => t.members.length > 0 && t.members.length < TEAM_SIZE).slice(0, 4);
	},
	['hub-open-teams'],
	{ tags: ['teams', 'users'], revalidate: REVALIDATE.standard },
);
