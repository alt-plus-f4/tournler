import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';

export interface HeadToHeadMatch {
	id: number;
	matchDate: Date;
	tournamentId: number;
	tournamentName: string;
	/** Oriented so scoreA/winnerA are always relative to the requested teamAId, regardless of which side each team played on in this particular match. */
	scoreA: number | null;
	scoreB: number | null;
	winnerId: number | null;
}

export interface HeadToHeadMapTally {
	mapName: string;
	winsA: number;
	winsB: number;
}

export interface HeadToHead {
	teamA: { id: number; name: string };
	teamB: { id: number; name: string };
	winsA: number;
	winsB: number;
	matches: HeadToHeadMatch[];
	perMap: HeadToHeadMapTally[];
}

/**
 * Completed non-pickup matches between two real teams, most recent first, plus the aggregate W-L
 * and per-map tallies the head-to-head panel shows. `excludeMatchId` drops the match the panel is
 * shown on itself (relevant once it's COMPLETED and would otherwise count against its own history).
 */
const loadHeadToHead = cachedQuery(
	async (teamAId: number, teamBId: number, excludeMatchId: number | null) => {
		const [teams, matches] = await Promise.all([
			db.cs2Team.findMany({ where: { id: { in: [teamAId, teamBId] } }, select: { id: true, name: true } }),
			db.matches.findMany({
				where: {
					isPickup: false,
					status: 'COMPLETED',
					id: excludeMatchId !== null ? { not: excludeMatchId } : undefined,
					OR: [
						{ teamAId, teamBId },
						{ teamAId: teamBId, teamBId: teamAId },
					],
				},
				orderBy: { matchDate: 'desc' },
				select: {
					id: true,
					matchDate: true,
					teamAId: true,
					teamBId: true,
					winnerId: true,
					scoreTeamA: true,
					scoreTeamB: true,
					tournament: { select: { id: true, name: true } },
					maps: { select: { mapName: true, winnerId: true }, orderBy: { order: 'asc' } },
				},
			}),
		]);

		const teamAName = teams.find((t) => t.id === teamAId)?.name ?? 'Team A';
		const teamBName = teams.find((t) => t.id === teamBId)?.name ?? 'Team B';

		let winsA = 0;
		let winsB = 0;
		const mapTallies = new Map<string, { winsA: number; winsB: number }>();

		const orientedMatches: HeadToHeadMatch[] = matches.map((m) => {
			// A given match's own teamA/teamB may have either requested team on either side —
			// reorient every field relative to the requested teamAId before aggregating.
			const swapped = m.teamAId === teamBId;
			const scoreA = swapped ? m.scoreTeamB : m.scoreTeamA;
			const scoreB = swapped ? m.scoreTeamA : m.scoreTeamB;
			if (m.winnerId === teamAId) winsA += 1;
			else if (m.winnerId === teamBId) winsB += 1;

			for (const map of m.maps) {
				if (map.winnerId !== teamAId && map.winnerId !== teamBId) continue;
				const tally = mapTallies.get(map.mapName) ?? { winsA: 0, winsB: 0 };
				if (map.winnerId === teamAId) tally.winsA += 1;
				else tally.winsB += 1;
				mapTallies.set(map.mapName, tally);
			}

			return { id: m.id, matchDate: m.matchDate, tournamentId: m.tournament.id, tournamentName: m.tournament.name, scoreA, scoreB, winnerId: m.winnerId };
		});

		return {
			teamA: { id: teamAId, name: teamAName },
			teamB: { id: teamBId, name: teamBName },
			winsA,
			winsB,
			matches: orientedMatches,
			perMap: Array.from(mapTallies, ([mapName, tally]) => ({ mapName, ...tally })).sort((a, b) => b.winsA + b.winsB - (a.winsA + a.winsB)),
		} satisfies HeadToHead;
	},
	['head-to-head'],
	{ tags: ['matches', 'teams'], revalidate: REVALIDATE.standard },
);

/** Returns null (rather than throwing) so a broken H2H lookup never takes down the match/team page around it. */
export async function fetchHeadToHead(teamAId: number, teamBId: number, excludeMatchId: number | null = null): Promise<HeadToHead | null> {
	try {
		return await loadHeadToHead(teamAId, teamBId, excludeMatchId);
	} catch (error) {
		console.error('Failed to load head-to-head history:', error);
		return null;
	}
}
