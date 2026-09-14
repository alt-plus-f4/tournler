import { Cs2Team } from '@prisma/client';
import { generateRoundRobinBracket, generateSingleEliminationBracket, generateDoubleEliminationBracket, GeneratedMatch } from '../bracket-generator';

function makeTeams(n: number): Cs2Team[] {
	return Array.from({ length: n }, (_, i) => ({ id: i + 1 }) as Cs2Team);
}

function byLocalIndex(matches: GeneratedMatch[]) {
	return new Map(matches.map((m) => [m.localIndex, m]));
}

describe('generateRoundRobinBracket', () => {
	it('schedules every pair exactly once across N-1 rounds for an even team count', () => {
		const teams = makeTeams(4);
		const matches = generateRoundRobinBracket(teams);

		const rounds = new Set(matches.map((m) => m.round));
		expect(rounds.size).toBe(3);
		expect(matches).toHaveLength(6);

		const pairs = new Set(matches.map((m) => [m.teamAId, m.teamBId].sort().join('-')));
		expect(pairs.size).toBe(6);
	});

	it('gives every team exactly one bye per round for an odd team count', () => {
		const teams = makeTeams(5);
		const matches = generateRoundRobinBracket(teams);

		const rounds = new Set(matches.map((m) => m.round));
		expect(rounds.size).toBe(5);
		expect(matches).toHaveLength(10);

		const pairs = new Set(matches.map((m) => [m.teamAId, m.teamBId].sort().join('-')));
		expect(pairs.size).toBe(10);

		const appearances = new Map<number, number>();
		for (const m of matches) {
			appearances.set(m.teamAId as number, (appearances.get(m.teamAId as number) ?? 0) + 1);
			appearances.set(m.teamBId as number, (appearances.get(m.teamBId as number) ?? 0) + 1);
		}
		for (const team of teams) {
			expect(appearances.get(team.id)).toBe(4); // sits out exactly 1 of 5 rounds
		}
	});
});

describe('generateSingleEliminationBracket', () => {
	it('builds a full tree with no byes for a power-of-2 team count', () => {
		const matches = generateSingleEliminationBracket(makeTeams(8));
		expect(matches).toHaveLength(8); // 4+2+1 winners bracket + 1 third-place decider

		const round1 = matches.filter((m) => m.round === 1);
		expect(round1).toHaveLength(4);
		expect(round1.every((m) => m.teamAId !== null && m.teamBId !== null)).toBe(true);
		expect(round1.every((m) => m.status === 'SCHEDULED')).toBe(true);

		const final = matches.find((m) => m.bracketSlot === 'WINNERS' && m.nextMatchLocalIndex === null)!;
		expect(final.round).toBe(3);
	});

	it('adds a 3rd-place decider fed by both semifinal losers', () => {
		const matches = generateSingleEliminationBracket(makeTeams(8));

		const thirdPlace = matches.find((m) => m.bracketSlot === 'THIRD_PLACE')!;
		expect(thirdPlace).toBeTruthy();
		expect(thirdPlace.round).toBe(2);

		const semifinals = matches.filter((m) => m.bracketSlot === 'WINNERS' && m.round === 2);
		expect(semifinals).toHaveLength(2);
		expect(semifinals.every((m) => m.nextLoserMatchLocalIndex === thirdPlace.localIndex)).toBe(true);
		expect(semifinals.map((m) => m.nextLoserMatchSlot).sort()).toEqual(['TEAM_A', 'TEAM_B']);
	});

	it('skips the 3rd-place decider for a 2-team bracket (no semifinal round to feed it)', () => {
		const matches = generateSingleEliminationBracket(makeTeams(2));
		expect(matches.some((m) => m.bracketSlot === 'THIRD_PLACE')).toBe(false);
	});

	it('resolves byes to top seeds and pre-fills the winner into round 2', () => {
		const matches = generateSingleEliminationBracket(makeTeams(5)); // P=8, 3 byes
		const round1 = matches.filter((m) => m.round === 1);
		expect(round1).toHaveLength(4);

		const byes = round1.filter((m) => m.status === 'COMPLETED');
		expect(byes).toHaveLength(3);
		for (const bye of byes) {
			expect(bye.teamAId === null || bye.teamBId === null).toBe(true);
			expect(bye.winnerId).not.toBeNull();
		}

		const map = byLocalIndex(matches);
		for (const bye of byes) {
			const next = map.get(bye.nextMatchLocalIndex as number)!;
			const slotValue = bye.nextMatchSlot === 'TEAM_A' ? next.teamAId : next.teamBId;
			expect(slotValue).toBe(bye.winnerId);
		}
	});
});

describe('generateDoubleEliminationBracket', () => {
	it('rejects fewer than 4 teams', () => {
		expect(() => generateDoubleEliminationBracket(makeTeams(3))).toThrow();
	});

	it('produces the standard 2N-2 total matches with no byes (N=4)', () => {
		const matches = generateDoubleEliminationBracket(makeTeams(4));
		expect(matches).toHaveLength(6); // WB 2+1, LB 1+1, GF 1

		const gf = matches.filter((m) => m.bracketSlot === 'GRAND_FINAL');
		expect(gf).toHaveLength(1);

		const wbFinal = matches.find((m) => m.bracketSlot === 'WINNERS' && m.round === 2)!;
		expect(wbFinal.nextMatchLocalIndex).toBe(gf[0].localIndex);
		expect(wbFinal.nextMatchSlot).toBe('TEAM_A');
	});

	it('produces the standard 2N-2 total matches with no byes (N=8)', () => {
		const matches = generateDoubleEliminationBracket(makeTeams(8));
		expect(matches).toHaveLength(14);

		const losers = matches.filter((m) => m.bracketSlot === 'LOSERS');
		const roundCounts = new Map<number, number>();
		for (const m of losers) roundCounts.set(m.round, (roundCounts.get(m.round) ?? 0) + 1);
		expect(Array.from(roundCounts.values()).sort((a, b) => b - a)).toEqual([2, 2, 1, 1]);
	});

	it('never wires a loser-feed for a bye match (N=6, byes present)', () => {
		const matches = generateDoubleEliminationBracket(makeTeams(6)); // P=8, 2 byes
		const byes = matches.filter((m) => m.bracketSlot === 'WINNERS' && m.round === 1 && m.status === 'COMPLETED');
		expect(byes.length).toBeGreaterThan(0);
		for (const bye of byes) {
			expect(bye.nextLoserMatchLocalIndex).toBeNull();
		}

		// Losers bracket must still converge to exactly one champion feeding Grand Final TEAM_B.
		const gf = matches.find((m) => m.bracketSlot === 'GRAND_FINAL')!;
		const feedsIntoGfTeamB = matches.filter((m) => m.nextMatchLocalIndex === gf.localIndex && m.nextMatchSlot === 'TEAM_B');
		expect(feedsIntoGfTeamB).toHaveLength(1);
		expect(feedsIntoGfTeamB[0].bracketSlot).toBe('LOSERS');
	});
});
