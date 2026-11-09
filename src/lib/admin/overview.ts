import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { connectKey, findAssignedMatches, loadPool, type AssignedMatch } from '@/lib/admin/servers';
import { getLiveStatus, type LiveStatus } from '@/lib/cs2/server-live';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
export const SPARK_WEEKS = 12;

/** Counts per rolling 7-day bucket, oldest first; the last bucket is the past 7 days. */
function weeklyBuckets(dates: Date[], now: number): number[] {
	const buckets = new Array<number>(SPARK_WEEKS).fill(0);
	for (const d of dates) {
		const age = Math.floor((now - d.getTime()) / WEEK);
		if (age >= 0 && age < SPARK_WEEKS) buckets[SPARK_WEEKS - 1 - age] += 1;
	}
	return buckets;
}

const teamLabel = (team: { name: string } | null, fallback: string | null, side: 'A' | 'B') => team?.name ?? fallback ?? `Side ${side}`;

/**
 * Database side of the admin overview: KPI totals + 12-week series from createdAt/completedAt,
 * live matches, the tournament pipeline and the activity feed. Cached for everyone (15s fallback,
 * invalidated by writes to any of these domains). Callers do their own admin:access check.
 */
export const getOverviewData = cachedQuery(
	async () => {
		const now = Date.now();
		const since = new Date(now - SPARK_WEEKS * WEEK);
		const notSystem = { isSystem: false };

		const [users, userDates, teams, teamDates, teamSizes, matchStatusGroups, completedDates, liveMatches, statusGroups, upcoming, recentUsers, recentTeams, recentTournaments, recentResults] =
			await Promise.all([
				db.user.count(),
				db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
				db.cs2Team.count(),
				db.cs2Team.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
				db.cs2Team.findMany({ select: { _count: { select: { members: true } } } }),
				db.matches.groupBy({ by: ['status'], _count: { _all: true } }),
				db.matches.findMany({ where: { status: 'COMPLETED', completedAt: { gte: since } }, select: { completedAt: true } }),
				db.matches.findMany({
					where: { status: { in: ['LIVE', 'PAUSED'] } },
					orderBy: [{ startedAt: 'asc' }, { matchDate: 'asc' }],
					take: 8,
					select: {
						id: true,
						status: true,
						round: true,
						isPickup: true,
						scoreTeamA: true,
						scoreTeamB: true,
						teamAName: true,
						teamBName: true,
						teamA: { select: { name: true } },
						teamB: { select: { name: true } },
						tournament: { select: { name: true, isSystem: true } },
						maps: { where: { status: { in: ['LIVE', 'PAUSED'] } }, orderBy: { order: 'asc' }, take: 1, select: { mapName: true, scoreTeamA: true, scoreTeamB: true } },
						gameServer: { select: { connectIp: true, port: true } },
					},
				}),
				db.cs2Tournament.groupBy({ by: ['status'], where: notSystem, _count: { _all: true } }),
				db.cs2Tournament.findMany({
					where: { ...notSystem, status: 'UPCOMING' },
					orderBy: { startDate: 'asc' },
					take: 4,
					select: { id: true, name: true, startDate: true, format: true, teamCapacity: true, _count: { select: { teams: true } } },
				}),
				db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, image: true, createdAt: true } }),
				db.cs2Team.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, createdAt: true } }),
				db.cs2Tournament.findMany({ where: notSystem, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, createdAt: true } }),
				db.matches.findMany({
					where: { status: 'COMPLETED', completedAt: { not: null } },
					orderBy: { completedAt: 'desc' },
					take: 6,
					select: { id: true, completedAt: true, scoreTeamA: true, scoreTeamB: true, teamAName: true, teamBName: true, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
				}),
			]);

		const usersWeekly = weeklyBuckets(
			userDates.map((u) => u.createdAt),
			now,
		);
		const teamsWeekly = weeklyBuckets(
			teamDates.map((t) => t.createdAt),
			now,
		);
		const matchesWeekly = weeklyBuckets(
			completedDates.flatMap((m) => (m.completedAt ? [m.completedAt] : [])),
			now,
		);

		const matchCounts = { SCHEDULED: 0, LIVE: 0, PAUSED: 0, COMPLETED: 0 };
		for (const g of matchStatusGroups) matchCounts[g.status] = g._count._all;

		const pipeline = { UPCOMING: 0, ONGOING: 0, COMPLETED: 0 };
		for (const g of statusGroups) pipeline[g.status] = g._count._all;

		type Activity = { key: string; kind: 'user' | 'team' | 'tournament' | 'result'; text: string; subject: string; href: string; at: Date; image?: string | null };
		const activity: Activity[] = [
			...recentUsers.map((u): Activity => ({ key: `u-${u.id}`, kind: 'user', subject: u.name || 'New player', text: 'signed up', href: `/profile/${u.id}`, at: u.createdAt, image: u.image })),
			...recentTeams.map((t): Activity => ({ key: `t-${t.id}`, kind: 'team', subject: t.name, text: 'team created', href: `/teams/${t.id}`, at: t.createdAt })),
			...recentTournaments.map((t): Activity => ({ key: `to-${t.id}`, kind: 'tournament', subject: t.name, text: 'tournament created', href: `/tournaments/${t.id}`, at: t.createdAt })),
			...recentResults.map((m): Activity => ({
				key: `m-${m.id}`,
				kind: 'result',
				subject: `${teamLabel(m.teamA, m.teamAName, 'A')} ${m.scoreTeamA ?? 0}–${m.scoreTeamB ?? 0} ${teamLabel(m.teamB, m.teamBName, 'B')}`,
				text: 'match finished',
				href: `/matches/${m.id}`,
				at: m.completedAt as Date,
			})),
		]
			.sort((a, b) => b.at.getTime() - a.at.getTime())
			.slice(0, 8);

		return {
			kpis: {
				users: { total: users, lastWeek: usersWeekly[SPARK_WEEKS - 1], weekly: usersWeekly },
				teams: { total: teams, lastWeek: teamsWeekly[SPARK_WEEKS - 1], weekly: teamsWeekly, fullRosters: teamSizes.filter((t) => t._count.members >= 5).length },
				matchesPlayed: { total: matchCounts.COMPLETED, lastWeek: matchesWeekly[SPARK_WEEKS - 1], weekly: matchesWeekly },
				live: { live: matchCounts.LIVE, paused: matchCounts.PAUSED, scheduled: matchCounts.SCHEDULED },
			},
			liveMatches: liveMatches.map((m) => ({
				id: m.id,
				status: m.status,
				round: m.round,
				teamA: teamLabel(m.teamA, m.teamAName, 'A'),
				teamB: teamLabel(m.teamB, m.teamBName, 'B'),
				scoreA: m.scoreTeamA ?? 0,
				scoreB: m.scoreTeamB ?? 0,
				map: m.maps[0] ? { name: m.maps[0].mapName, scoreA: m.maps[0].scoreTeamA ?? 0, scoreB: m.maps[0].scoreTeamB ?? 0 } : null,
				context: m.isPickup || m.tournament.isSystem ? 'Pickup' : m.tournament.name,
				serverKey: m.gameServer ? connectKey(m.gameServer.connectIp, m.gameServer.port) : null,
			})),
			pipeline,
			upcoming: upcoming.map((t) => ({ id: t.id, name: t.name, startDate: t.startDate, format: t.format, capacity: t.teamCapacity, registered: t._count.teams })),
			activity,
		};
	},
	['admin-overview'],
	{ tags: [CACHE_TAGS.users, CACHE_TAGS.teams, CACHE_TAGS.tournaments, CACHE_TAGS.matches], revalidate: REVALIDATE.live },
);

export type OverviewData = Awaited<ReturnType<typeof getOverviewData>>;

export type FleetServer = { id: string; address: string; key: string; live: LiveStatus; match: AssignedMatch | null };
export type Fleet = { ok: true; servers: FleetServer[] } | { ok: false };

/**
 * The CS2 pool with live RCON status (each probe has a short timeout and a shared 5s in-memory
 * cache, see getLiveStatus) and the match assigned to each server. Deduped per request so the
 * attention strip, fleet grid and system list share one probe round. Callers must check
 * `servers:manage` first, the same gate as GET /api/admin/servers.
 */
export const getFleet = cache(async (): Promise<Fleet> => {
	const pool = await loadPool();
	if (!pool.ok) return { ok: false };
	const [live, assigned] = await Promise.all([Promise.all(pool.pool.map((s) => getLiveStatus(s))), findAssignedMatches(pool.pool)]);
	return {
		ok: true,
		servers: pool.pool.map((s, i) => ({ id: s.id, address: `${s.ip}:${s.port}`, key: connectKey(s.ip, s.port), live: live[i].live, match: assigned.get(s.id) ?? null })),
	};
});

/** Round-trip time of a trivial query, in ms; null if the database is unreachable. Not cached on purpose. */
export async function measureDbLatency(): Promise<number | null> {
	const started = performance.now();
	try {
		await db.$queryRaw`SELECT 1`;
		return Math.round(performance.now() - started);
	} catch {
		return null;
	}
}

/** Which integrations have their env configured (presence only; values never leave the server). */
export function integrationConfig() {
	const has = (...keys: string[]) => keys.every((k) => Boolean(process.env[k]));
	return [
		{ label: 'Email sign-in', ok: has('EMAIL_SERVER_HOST', 'EMAIL_FROM') },
		{ label: 'Discord OAuth', ok: has('DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET') },
		{ label: 'Steam OpenID', ok: has('STEAM_API_KEY') },
		{ label: 'Blob storage', ok: has('BLOB_READ_WRITE_TOKEN') },
		{ label: 'Cron · auto-start', ok: Boolean(process.env.CRON_API_KEY || process.env.CRON_SECRET) },
	];
}
