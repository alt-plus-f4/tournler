import { MatchSlot } from '@prisma/client';
import { db } from '@/lib/db';

export interface PlayerStatInput {
	userId: string;
	/** Real (non-pickup) matches only — a real Cs2Team id. */
	teamId?: number;
	/** Pickup matches only — which side the player was on (no Cs2Team to use as teamId). */
	side?: MatchSlot;
	kills: number;
	deaths: number;
	assists: number;
}

/**
 * Upserts one row per player for a match — a player's stats for a given
 * match are a single cumulative snapshot (not per-round deltas), so a
 * re-post from the game server (e.g. after every round) just overwrites the
 * same row rather than accumulating duplicates.
 */
export async function upsertPlayerMatchStats(matchId: number, stats: PlayerStatInput[]): Promise<void> {
	for (const stat of stats) {
		await db.playerMatchStat.upsert({
			where: { matchId_userId: { matchId, userId: stat.userId } },
			create: { matchId, teamId: stat.teamId, side: stat.side, userId: stat.userId, kills: stat.kills, deaths: stat.deaths, assists: stat.assists },
			update: { kills: stat.kills, deaths: stat.deaths, assists: stat.assists },
		});
	}
}

export interface PlayerStatSummary {
	userId: string;
	name: string | null;
	image: string | null;
	teamId: number | null;
	teamName: string | null;
	kills: number;
	deaths: number;
	assists: number;
	matchesPlayed: number;
	kd: number;
}

function summarize(rows: { userId: string; kills: number; deaths: number; assists: number; user: { name: string | null; image: string | null }; team: { id: number; name: string } | null }[]): PlayerStatSummary[] {
	const byUser = new Map<string, PlayerStatSummary>();

	for (const row of rows) {
		const existing = byUser.get(row.userId);
		if (existing) {
			existing.kills += row.kills;
			existing.deaths += row.deaths;
			existing.assists += row.assists;
			existing.matchesPlayed += 1;
		} else {
			byUser.set(row.userId, {
				userId: row.userId,
				name: row.user.name,
				image: row.user.image,
				teamId: row.team?.id ?? null,
				teamName: row.team?.name ?? null,
				kills: row.kills,
				deaths: row.deaths,
				assists: row.assists,
				matchesPlayed: 1,
				kd: 0,
			});
		}
	}

	return Array.from(byUser.values())
		.map((s) => ({ ...s, kd: s.deaths > 0 ? s.kills / s.deaths : s.kills }))
		.sort((a, b) => b.kills - a.kills || b.kd - a.kd);
}

/** Per-tournament leaderboard, aggregated across every completed match. */
export async function computeTournamentPlayerStats(tournamentId: number): Promise<PlayerStatSummary[]> {
	const rows = await db.playerMatchStat.findMany({
		where: { match: { tournamentId } },
		include: { user: { select: { name: true, image: true } }, team: { select: { id: true, name: true } } },
	});
	return summarize(rows);
}

export interface PlayerCareerStats {
	kills: number;
	deaths: number;
	assists: number;
	matchesPlayed: number;
	kd: number;
	wins: number;
	losses: number;
	winRate: number;
}

/** Career stats for a single player, totalled across every match they've played (not team-scoped — a player may have represented several teams over time). */
export async function computePlayerCareerStats(userId: string): Promise<PlayerCareerStats | null> {
	const rows = await db.playerMatchStat.findMany({
		where: { userId },
		select: { kills: true, deaths: true, assists: true, teamId: true, side: true, match: { select: { status: true, winnerId: true, winnerSide: true } } },
	});
	if (rows.length === 0) return null;

	const totals = rows.reduce(
		(acc, r) => ({ kills: acc.kills + r.kills, deaths: acc.deaths + r.deaths, assists: acc.assists + r.assists }),
		{ kills: 0, deaths: 0, assists: 0 },
	);

	let wins = 0;
	let losses = 0;
	for (const r of rows) {
		if (r.match.status !== 'COMPLETED') continue;
		// Pickup rows record `side` (no Cs2Team to use as teamId); real matches record `teamId`.
		if (r.side !== null) {
			if (r.match.winnerSide === null) continue;
			if (r.match.winnerSide === r.side) wins += 1;
			else losses += 1;
		} else {
			if (r.match.winnerId === null) continue;
			if (r.match.winnerId === r.teamId) wins += 1;
			else losses += 1;
		}
	}
	const decided = wins + losses;

	return {
		...totals,
		matchesPlayed: rows.length,
		kd: totals.deaths > 0 ? totals.kills / totals.deaths : totals.kills,
		wins,
		losses,
		winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
	};
}

export interface PlayerRecentMatch {
	matchId: number;
	tournamentName: string;
	opponentName: string;
	result: 'W' | 'L';
	scoreFor: number | null;
	scoreAgainst: number | null;
	matchDate: string;
	kills: number;
	deaths: number;
	assists: number;
}

/** A player's most recent completed matches, newest first — powers the "recent form" strip and match history list. */
export async function getPlayerRecentMatches(userId: string, limit = 10): Promise<PlayerRecentMatch[]> {
	const rows = await db.playerMatchStat.findMany({
		// Real matches decide a winner via winnerId, pickups via winnerSide (see Matches.winnerSide)
		// — a completed match has exactly one of the two set, never both.
		where: { userId, match: { status: 'COMPLETED', OR: [{ winnerId: { not: null } }, { winnerSide: { not: null } }] } },
		orderBy: { match: { matchDate: 'desc' } },
		take: limit,
		select: {
			teamId: true,
			side: true,
			kills: true,
			deaths: true,
			assists: true,
			match: {
				select: {
					id: true,
					matchDate: true,
					winnerId: true,
					winnerSide: true,
					teamAId: true,
					teamAName: true,
					teamBName: true,
					scoreTeamA: true,
					scoreTeamB: true,
					tournament: { select: { name: true } },
					teamA: { select: { name: true } },
					teamB: { select: { name: true } },
				},
			},
		},
	});

	return rows.map((row) => {
		const m = row.match;
		const isTeamA = row.side !== null ? row.side === 'TEAM_A' : row.teamId === m.teamAId;
		const won = row.side !== null ? m.winnerSide === row.side : m.winnerId === row.teamId;
		const opponentName = row.side !== null ? (isTeamA ? (m.teamBName ?? 'Side B') : (m.teamAName ?? 'Side A')) : (isTeamA ? m.teamB : m.teamA)?.name;
		return {
			matchId: m.id,
			tournamentName: m.tournament.name,
			opponentName: opponentName ?? 'Unknown',
			result: won ? 'W' : 'L',
			scoreFor: isTeamA ? m.scoreTeamA : m.scoreTeamB,
			scoreAgainst: isTeamA ? m.scoreTeamB : m.scoreTeamA,
			matchDate: m.matchDate.toISOString(),
			kills: row.kills,
			deaths: row.deaths,
			assists: row.assists,
		};
	});
}
