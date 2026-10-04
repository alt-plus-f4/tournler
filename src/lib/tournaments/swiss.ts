import type { DbTx } from '@/lib/db';
import { db } from '@/lib/db';

export interface SwissStanding {
	teamId: number;
	wins: number;
	losses: number;
	played: number;
	/** Sum of every opponent played's win total (byes contribute 0) — the standard Swiss tiebreak, rewarding a tougher schedule. */
	buchholz: number;
	hadBye: boolean;
}

type Client = DbTx | typeof db;

/**
 * Standings after every currently-COMPLETED match, wins desc then Buchholz desc then team id as a
 * deterministic final tiebreak (mirrors computeRoundRobinStandings's shape/ordering). Also returns
 * every pair that has already played (bye included, keyed by both team ids) so the pairing step
 * can avoid rematches, and which teams have already had a bye so it doesn't repeat one.
 */
export async function computeSwissStandings(
	client: Client,
	tournamentId: number,
): Promise<{ standings: SwissStanding[]; playedPairs: Set<string>; byeTeamIds: Set<number> }> {
	const tournament = await client.cs2Tournament.findUniqueOrThrow({
		where: { id: tournamentId },
		include: { teams: { select: { id: true } }, matches: true },
	});

	const wins = new Map<number, number>();
	const losses = new Map<number, number>();
	const played = new Map<number, number>();
	const opponents = new Map<number, number[]>();
	const byeTeamIds = new Set<number>();
	const playedPairs = new Set<string>();

	for (const team of tournament.teams) {
		wins.set(team.id, 0);
		losses.set(team.id, 0);
		played.set(team.id, 0);
		opponents.set(team.id, []);
	}

	const completed = tournament.matches.filter((m) => m.status === 'COMPLETED' && m.winnerId !== null);
	for (const m of completed) {
		const isBye = m.teamAId !== null && m.teamBId === null;
		if (isBye) {
			byeTeamIds.add(m.teamAId as number);
			wins.set(m.winnerId as number, (wins.get(m.winnerId as number) ?? 0) + 1);
			played.set(m.winnerId as number, (played.get(m.winnerId as number) ?? 0) + 1);
			continue;
		}
		if (m.teamAId === null || m.teamBId === null) continue;
		const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
		playedPairs.add(pairKey(m.teamAId, m.teamBId));
		wins.set(m.winnerId as number, (wins.get(m.winnerId as number) ?? 0) + 1);
		played.set(m.winnerId as number, (played.get(m.winnerId as number) ?? 0) + 1);
		losses.set(loserId, (losses.get(loserId) ?? 0) + 1);
		played.set(loserId, (played.get(loserId) ?? 0) + 1);
		opponents.get(m.teamAId)?.push(m.teamBId);
		opponents.get(m.teamBId)?.push(m.teamAId);
	}

	const standings: SwissStanding[] = tournament.teams.map((team) => ({
		teamId: team.id,
		wins: wins.get(team.id) ?? 0,
		losses: losses.get(team.id) ?? 0,
		played: played.get(team.id) ?? 0,
		buchholz: (opponents.get(team.id) ?? []).reduce((sum, opponentId) => sum + (wins.get(opponentId) ?? 0), 0),
		hadBye: byeTeamIds.has(team.id),
	}));

	standings.sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
		return a.teamId - b.teamId;
	});

	return { standings, playedPairs, byeTeamIds };
}

function pairKey(aId: number, bId: number): string {
	return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

export interface SwissPairing {
	teamAId: number;
	teamBId: number;
}

/**
 * Pairs a round's field from standings order: walk the ranking top to bottom, pairing each team
 * with the highest-ranked remaining opponent it hasn't already played (falling back to a rematch
 * only if literally every remaining opponent is one — rare, and better than deadlocking). An odd
 * field gets one bye, given to the lowest-ranked team that hasn't already had one (or the literal
 * last-ranked team if everyone already has).
 */
export function pairSwissRound(standings: SwissStanding[], playedPairs: Set<string>): { pairs: SwissPairing[]; byeTeamId: number | null } {
	const pool = [...standings];
	let byeTeamId: number | null = null;

	if (pool.length % 2 !== 0) {
		let byeIndex = -1;
		for (let i = pool.length - 1; i >= 0; i--) {
			if (!pool[i].hadBye) {
				byeIndex = i;
				break;
			}
		}
		if (byeIndex === -1) byeIndex = pool.length - 1;
		byeTeamId = pool.splice(byeIndex, 1)[0].teamId;
	}

	const pairs: SwissPairing[] = [];
	while (pool.length > 0) {
		const a = pool.shift() as SwissStanding;
		let opponentIndex = pool.findIndex((b) => !playedPairs.has(pairKey(a.teamId, b.teamId)));
		if (opponentIndex === -1) opponentIndex = 0;
		const b = pool.splice(opponentIndex, 1)[0];
		pairs.push({ teamAId: a.teamId, teamBId: b.teamId });
	}

	return { pairs, byeTeamId };
}

/**
 * Inserts the next Swiss round's matches once every match in `completedRound` is COMPLETED —
 * called from recordMatchResult, inside the same transaction and before finalizeTournamentIfComplete,
 * so the newly-inserted (incomplete) round exists before that check runs and would otherwise see a
 * "fully complete" tournament after round 1. A no-op past the tournament's configured swissRounds
 * (finalizeTournamentIfComplete then completes it normally) or if the round isn't fully done yet.
 */
export async function maybeAdvanceSwissRound(tx: DbTx, tournamentId: number, swissRounds: number | null, completedRound: number): Promise<void> {
	if (!swissRounds || completedRound >= swissRounds) return;

	const stillOpen = await tx.matches.count({ where: { tournamentId, round: completedRound, status: { not: 'COMPLETED' } } });
	if (stillOpen > 0) return;

	const { standings, playedPairs } = await computeSwissStandings(tx, tournamentId);
	const { pairs, byeTeamId } = pairSwissRound(standings, playedPairs);

	const now = new Date();
	const nextRound = completedRound + 1;
	let position = 0;

	await tx.matches.createMany({
		data: [
			...pairs.map((p) => ({
				tournamentId,
				teamAId: p.teamAId,
				teamBId: p.teamBId,
				round: nextRound,
				position: position++,
				bracketSlot: 'WINNERS' as const,
				matchDate: now,
			})),
			...(byeTeamId !== null
				? [
						{
							tournamentId,
							teamAId: byeTeamId,
							teamBId: null,
							winnerId: byeTeamId,
							status: 'COMPLETED' as const,
							round: nextRound,
							position: position++,
							bracketSlot: 'WINNERS' as const,
							matchDate: now,
							completedAt: now,
						},
					]
				: []),
		],
	});
}
