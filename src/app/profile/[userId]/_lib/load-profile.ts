import { cache } from 'react';
import { TournamentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { getFaceitInfo } from '@/lib/faceit';
import { computePlayerCareerStats, getPlayerRecentMatches } from '@/lib/tournaments/player-stats';
import { finalBracketSlot, pickDecidedFinal } from '@/app/tournaments/queries';

// Same projection GET /api/users/[slug] reads; steam/discord are then gated by showSteam/showDiscord.
const PUBLIC_USER_SELECT = {
	id: true,
	name: true,
	bio: true,
	image: true,
	steam: { select: { steamId: true, createdAt: true } },
	discord: { select: { discordId: true } },
	// One team per game (CS2 and/or LoL), shown in that game's profile section.
	teams: { select: { id: true, name: true, logo: true, game: true, _count: { select: { members: true } } } },
	// Public part of the Riot ID only; the ownership challenge is loaded for the owner separately.
	riot: { select: { gameName: true, tagLine: true, region: true, verifiedAt: true } },
	games: true,
	// Privacy flags: the page strips steam/discord for everyone but the owner when these are false.
	showDiscord: true,
	showSteam: true,
	showRiot: true,
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

/** An HLTV-style event trophy: a completed tournament the player won. */
export interface EventTrophy {
	tournamentId: number;
	name: string;
	/** Tournament logo, else its banner, else null (a generic trophy glyph is drawn). */
	imageUrl: string | null;
	imageKind: 'logo' | 'banner' | null;
	/** When the final was decided (falls back to the tournament's end date). */
	wonAt: Date;
	teamName: string;
}

/**
 * Every COMPLETED tournament whose champion (the winner of the deciding final, same rule as
 * getTournamentChampion) the player played for. "Played for" is decided per final:
 * - if the final has PlayerMatchStat rows, the player must have a row on the winning team;
 * - otherwise (no stats reported) the player counts if they're *currently* a member of the
 *   champion team (any of their per-game teams). That's an approximation: team membership isn't
 *   versioned, so a player who joined the team after the win gets the trophy and one who left loses it.
 */
async function computeEventTrophies(userId: string, currentTeamIds: number[]): Promise<EventTrophy[]> {
	const tournaments = await db.cs2Tournament.findMany({
		where: { status: TournamentStatus.COMPLETED, isSystem: false, format: { not: 'ROUND_ROBIN' } },
		select: { id: true, name: true, logoUrl: true, bannerUrl: true, endDate: true, format: true },
	});
	if (tournaments.length === 0) return [];

	const slotOf = new Map(tournaments.map((t) => [t.id, finalBracketSlot(t.format)] as const));
	const bySlot = (slot: 'WINNERS' | 'GRAND_FINAL') => tournaments.filter((t) => slotOf.get(t.id) === slot).map((t) => t.id);

	// Highest round of each tournament's final slot, then every match in that round (normally one).
	const tops = await db.matches.groupBy({
		by: ['tournamentId', 'bracketSlot'],
		where: {
			OR: [
				{ tournamentId: { in: bySlot('WINNERS') }, bracketSlot: 'WINNERS' },
				{ tournamentId: { in: bySlot('GRAND_FINAL') }, bracketSlot: 'GRAND_FINAL' },
			],
		},
		_max: { round: true },
	});
	const topRounds = tops.filter((t) => t._max.round !== null && slotOf.get(t.tournamentId) === t.bracketSlot);
	if (topRounds.length === 0) return [];

	const finalRoundMatches = await db.matches.findMany({
		where: { OR: topRounds.map((t) => ({ tournamentId: t.tournamentId, bracketSlot: t.bracketSlot, round: t._max.round as number })) },
		select: { id: true, tournamentId: true, round: true, status: true, winnerId: true, completedAt: true, winner: { select: { name: true } } },
	});

	const finals = new Map<number, (typeof finalRoundMatches)[number]>();
	for (const t of topRounds) {
		const decided = pickDecidedFinal(finalRoundMatches.filter((m) => m.tournamentId === t.tournamentId));
		if (decided?.winnerId && decided.winner) finals.set(t.tournamentId, decided);
	}
	if (finals.size === 0) return [];

	const stats = await db.playerMatchStat.findMany({
		where: { matchId: { in: [...finals.values()].map((m) => m.id) } },
		select: { matchId: true, userId: true, teamId: true },
	});

	const trophies: EventTrophy[] = [];
	for (const t of tournaments) {
		const final = finals.get(t.id);
		if (!final) continue;
		const finalStats = stats.filter((s) => s.matchId === final.id);
		const playedFor = finalStats.length > 0 ? finalStats.some((s) => s.userId === userId && s.teamId === final.winnerId) : final.winnerId !== null && currentTeamIds.includes(final.winnerId);
		if (!playedFor) continue;
		const imageUrl = t.logoUrl || t.bannerUrl || null;
		trophies.push({
			tournamentId: t.id,
			name: t.name,
			imageUrl,
			imageKind: t.logoUrl ? 'logo' : t.bannerUrl ? 'banner' : null,
			wonAt: final.completedAt ?? t.endDate,
			teamName: final.winner?.name ?? '',
		});
	}
	return trophies.sort((a, b) => b.wonAt.getTime() - a.wonAt.getTime());
}

// Public data (the same for every viewer); keyed by user + current teams so a roster change re-keys it.
const loadEventTrophies = cachedQuery(computeEventTrophies, ['profile-event-trophies'], {
	tags: ['tournaments', 'matches', 'teams', 'users'],
	revalidate: REVALIDATE.standard,
});

/** Career stats, the last 20 matches, the real FACEIT level (external API; getFaceitInfo caches it an hour) and event trophies. */
export function loadProfileExtras(user: ProfileUser) {
	return Promise.all([
		loadCareerStats(user.id),
		loadRecentMatches(user.id),
		// The FACEIT level is public FACEIT data, so it's looked up even when the player hides Steam.
		user.steam ? getFaceitInfo(user.steam.steamId) : Promise.resolve(null),
		loadEventTrophies(user.id, user.teams.map((t) => t.id).sort((a, b) => a - b)),
	]);
}
