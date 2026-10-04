import { pairSwissRound, type SwissStanding } from '../swiss';
import { generateSwissRound1 } from '../bracket-generator';
import { Cs2Team } from '@prisma/client';

function makeTeams(n: number): Cs2Team[] {
	return Array.from({ length: n }, (_, i) => ({ id: i + 1 }) as Cs2Team);
}

function standingsFor(teamIds: number[], overrides: Partial<Record<number, Partial<SwissStanding>>> = {}): SwissStanding[] {
	return teamIds.map((teamId) => ({ teamId, wins: 0, losses: 0, played: 0, buchholz: 0, hadBye: false, ...overrides[teamId] }));
}

describe('pairSwissRound', () => {
	it('pairs an even field with no bye', () => {
		const standings = standingsFor([1, 2, 3, 4]);
		const { pairs, byeTeamId } = pairSwissRound(standings, new Set());
		expect(byeTeamId).toBeNull();
		expect(pairs).toHaveLength(2);
		const paired = pairs.flatMap((p) => [p.teamAId, p.teamBId]).sort((a, b) => a - b);
		expect(paired).toEqual([1, 2, 3, 4]);
	});

	it('gives the lowest-ranked team without a prior bye the bye for an odd field', () => {
		const standings = standingsFor([1, 2, 3], { 3: { hadBye: false } });
		const { pairs, byeTeamId } = pairSwissRound(standings, new Set());
		expect(byeTeamId).toBe(3);
		expect(pairs).toEqual([{ teamAId: 1, teamBId: 2 }]);
	});

	it('skips a team that already had a bye when picking the next bye', () => {
		// Ranked 1 (best) .. 3 (worst); team 3 already had a bye, so team 2 gets it this time.
		const standings = standingsFor([1, 2, 3], { 3: { hadBye: true } });
		const { byeTeamId } = pairSwissRound(standings, new Set());
		expect(byeTeamId).toBe(2);
	});

	it('avoids rematches when an alternative opponent is available', () => {
		const standings = standingsFor([1, 2, 3, 4]);
		// 1 already played 2; with a fresh field the algorithm should not re-pair them if avoidable.
		const playedPairs = new Set(['1:2']);
		const { pairs } = pairSwissRound(standings, playedPairs);
		const has12Rematch = pairs.some((p) => (p.teamAId === 1 && p.teamBId === 2) || (p.teamAId === 2 && p.teamBId === 1));
		expect(has12Rematch).toBe(false);
	});

	it('falls back to a rematch rather than leaving a team unpaired when no fresh opponent exists', () => {
		const standings = standingsFor([1, 2]);
		const playedPairs = new Set(['1:2']);
		const { pairs } = pairSwissRound(standings, playedPairs);
		expect(pairs).toEqual([{ teamAId: 1, teamBId: 2 }]);
	});
});

describe('generateSwissRound1', () => {
	it('pairs every team exactly once for an even count, no byes', () => {
		const matches = generateSwissRound1(makeTeams(4));
		expect(matches).toHaveLength(2);
		expect(matches.every((m) => m.status === 'SCHEDULED')).toBe(true);
		const appearances = matches.flatMap((m) => [m.teamAId, m.teamBId]).sort((a, b) => (a ?? 0) - (b ?? 0));
		expect(appearances).toEqual([1, 2, 3, 4]);
	});

	it('gives one team a completed bye match for an odd count', () => {
		const matches = generateSwissRound1(makeTeams(5));
		expect(matches).toHaveLength(3); // 2 real matches + 1 bye
		const byes = matches.filter((m) => m.status === 'COMPLETED');
		expect(byes).toHaveLength(1);
		expect(byes[0].teamBId).toBeNull();
		expect(byes[0].winnerId).toBe(byes[0].teamAId);
	});

	it('never wires feeder pointers — Swiss rounds are generated dynamically, not precomputed', () => {
		const matches = generateSwissRound1(makeTeams(6));
		expect(matches.every((m) => m.nextMatchLocalIndex === null && m.nextLoserMatchLocalIndex === null)).toBe(true);
	});
});
