/**
 * bracket-advancement is tested against a small hand-rolled in-memory fake
 * Prisma client (no DB-mock precedent exists elsewhere in this repo, and
 * standing up a real ephemeral Postgres for tests is out of scope here).
 * Bracket skeletons are built with the REAL bracket-generator so these tests
 * exercise actual generator output, not a hand-authored approximation of it.
 */
import { Cs2Team } from '@prisma/client';

jest.mock('@/lib/db', () => {
	const state = {
		matches: [] as any[],
		tournament: { id: 1, status: 'ONGOING', format: 'SINGLE_ELIMINATION', teams: [] as any[], __nextId: 1000 } as any,
	};

	function notFoundError() {
		const err: any = new Error('Record not found');
		err.code = 'P2025';
		return err;
	}

	function matchMatchesWhere(m: any, where: any) {
		for (const key of Object.keys(where)) {
			if (key === 'status' && where.status?.not) {
				if (m.status === where.status.not) return false;
				continue;
			}
			if (where[key] === null) {
				if (m[key] !== null) return false;
				continue;
			}
			if (m[key] !== where[key]) return false;
		}
		return true;
	}

	const matchesApi = {
		findUniqueOrThrow: async ({ where }: any) => {
			const m = state.matches.find((x) => x.id === where.id);
			if (!m) throw notFoundError();
			return { ...m };
		},
		findMany: async ({ where }: any = {}) => state.matches.filter((m) => (where?.tournamentId === undefined ? true : m.tournamentId === where.tournamentId)).map((m) => ({ ...m })),
		updateMany: async ({ where, data }: any) => {
			let count = 0;
			for (const m of state.matches) {
				if (!matchMatchesWhere(m, where)) continue;
				Object.assign(m, data);
				count++;
			}
			return { count };
		},
		update: async ({ where, data }: any) => {
			const m = state.matches.find((x) => x.id === where.id);
			if (!m) throw notFoundError();
			Object.assign(m, data);
			return { ...m };
		},
		create: async ({ data }: any) => {
			const m = {
				id: ++state.tournament.__nextId,
				scoreTeamA: null,
				scoreTeamB: null,
				winnerId: null,
				startedAt: null,
				completedAt: null,
				nextMatchId: null,
				nextMatchSlot: null,
				nextLoserMatchId: null,
				nextLoserMatchSlot: null,
				status: 'SCHEDULED',
				...data,
			};
			state.matches.push(m);
			return { ...m };
		},
		count: async ({ where }: any = {}) =>
			state.matches.filter((m) => {
				if (where?.tournamentId !== undefined && m.tournamentId !== where.tournamentId) return false;
				if (where?.status?.not && m.status === where.status.not) return false;
				return true;
			}).length,
	};

	const cs2TournamentApi = {
		updateMany: async ({ where, data }: any) => {
			if (state.tournament.id !== where.id) return { count: 0 };
			if (where.status && state.tournament.status !== where.status) return { count: 0 };
			Object.assign(state.tournament, data);
			return { count: 1 };
		},
		findUniqueOrThrow: async ({ where, include }: any) => {
			if (state.tournament.id !== where.id) throw notFoundError();
			const result: any = { ...state.tournament };
			if (include?.matches) result.matches = state.matches.filter((m) => m.tournamentId === state.tournament.id);
			if (include?.teams) result.teams = state.tournament.teams;
			return result;
		},
	};

	const fakeDb: any = {
		matches: matchesApi,
		cs2Tournament: cs2TournamentApi,
		$transaction: (fn: any) => fn(fakeDb),
	};
	fakeDb.__state = state;
	state.tournament.__nextId = 1000;

	return { db: fakeDb };
});

import { db } from '@/lib/db';
import { recordMatchResult, MatchResultConflictError, computeRoundRobinStandings } from '../bracket-advancement';
import { generateSingleEliminationBracket, generateDoubleEliminationBracket, generateRoundRobinBracket, GeneratedMatch } from '../bracket-generator';

function makeTeams(n: number): Cs2Team[] {
	return Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Team ${i + 1}` }) as Cs2Team);
}

function resetState(teams: Cs2Team[]) {
	const state = (db as any).__state;
	state.matches = [];
	state.tournament = { id: 1, status: 'ONGOING', format: 'SINGLE_ELIMINATION', teams, __nextId: 1000 } as any;
}

/** Inserts generator output into the fake db, remapping localIndex -> fake row id (localIndex + 1). */
function seed(generated: GeneratedMatch[], tournamentId = 1) {
	const state = (db as any).__state;
	const idFor = (localIndex: number) => localIndex + 1;
	for (const m of generated) {
		state.matches.push({
			id: idFor(m.localIndex),
			tournamentId,
			teamAId: m.teamAId,
			teamBId: m.teamBId,
			winnerId: m.winnerId,
			scoreTeamA: null,
			scoreTeamB: null,
			matchDate: new Date(),
			status: m.status,
			round: m.round,
			position: m.position,
			bracketSlot: m.bracketSlot,
			startedAt: null,
			completedAt: m.status === 'COMPLETED' ? new Date() : null,
			nextMatchId: m.nextMatchLocalIndex !== null ? idFor(m.nextMatchLocalIndex) : null,
			nextMatchSlot: m.nextMatchSlot,
			nextLoserMatchId: m.nextLoserMatchLocalIndex !== null ? idFor(m.nextLoserMatchLocalIndex) : null,
			nextLoserMatchSlot: m.nextLoserMatchSlot,
		});
	}
}

function findMatch(round: number, bracketSlot: string, position = 0) {
	return (db as any).__state.matches.find((m: any) => m.round === round && m.bracketSlot === bracketSlot && m.position === position);
}

describe('recordMatchResult — single elimination', () => {
	beforeEach(() => resetState(makeTeams(4)));

	it('advances the winner into round 2 and completes the tournament after the final', async () => {
		const generated = generateSingleEliminationBracket(makeTeams(4));
		seed(generated);

		const r1m0 = findMatch(1, 'WINNERS', 0);
		const r1m1 = findMatch(1, 'WINNERS', 1);

		await recordMatchResult(r1m0.id, { scoreTeamA: 16, scoreTeamB: 10, winnerId: r1m0.teamAId });
		await recordMatchResult(r1m1.id, { scoreTeamA: 5, scoreTeamB: 16, winnerId: r1m1.teamBId });

		const final = findMatch(2, 'WINNERS', 0);
		expect(final.teamAId).toBe(r1m0.teamAId);
		expect(final.teamBId).toBe(r1m1.teamBId);
		expect((db as any).__state.tournament.status).toBe('ONGOING');

		await recordMatchResult(final.id, { scoreTeamA: 16, scoreTeamB: 3, winnerId: final.teamAId });
		expect((db as any).__state.tournament.status).toBe('COMPLETED');
	});

	it('is idempotent for a repeated identical winner and rejects a conflicting one', async () => {
		const generated = generateSingleEliminationBracket(makeTeams(4));
		seed(generated);
		const match = findMatch(1, 'WINNERS', 0);

		const first = await recordMatchResult(match.id, { scoreTeamA: 16, scoreTeamB: 10, winnerId: match.teamAId });
		const second = await recordMatchResult(match.id, { scoreTeamA: 16, scoreTeamB: 10, winnerId: match.teamAId });
		expect(second.winnerId).toBe(first.winnerId);

		await expect(recordMatchResult(match.id, { winnerId: match.teamBId })).rejects.toThrow(MatchResultConflictError);
	});

	it('resolves byes at generation time with no recordMatchResult call needed', () => {
		const generated = generateSingleEliminationBracket(makeTeams(3)); // P=4, 1 bye
		seed(generated);
		const bye = (db as any).__state.matches.find((m: any) => m.status === 'COMPLETED');
		expect(bye).toBeTruthy();
		expect(bye.winnerId).not.toBeNull();
	});
});

describe('recordMatchResult — double elimination grand final', () => {
	beforeEach(() => resetState(makeTeams(4)));

	async function playToGrandFinal() {
		const generated = generateDoubleEliminationBracket(makeTeams(4));
		seed(generated);

		const wbR1m0 = findMatch(1, 'WINNERS', 0);
		const wbR1m1 = findMatch(1, 'WINNERS', 1);
		await recordMatchResult(wbR1m0.id, { winnerId: wbR1m0.teamAId }); // teamA advances, teamB drops to LB
		await recordMatchResult(wbR1m1.id, { winnerId: wbR1m1.teamAId });

		const lbR1 = findMatch(1, 'LOSERS', 0);
		await recordMatchResult(lbR1.id, { winnerId: lbR1.teamAId }); // one LB survivor

		const wbFinal = findMatch(2, 'WINNERS', 0);
		await recordMatchResult(wbFinal.id, { winnerId: wbFinal.teamAId }); // WB champion decided, its loser drops to LB final

		const lbFinal = findMatch(2, 'LOSERS', 0);
		await recordMatchResult(lbFinal.id, { winnerId: lbFinal.teamAId }); // LB champion decided

		const gf = findMatch(1, 'GRAND_FINAL', 0);
		return { gf, wbChampionId: wbFinal.teamAId, lbChampionId: lbFinal.teamAId };
	}

	it('finishes immediately when the winners-bracket side wins game 1', async () => {
		const { gf, wbChampionId } = await playToGrandFinal();
		expect(gf.teamAId).toBe(wbChampionId);

		await recordMatchResult(gf.id, { winnerId: gf.teamAId });

		const reset = (db as any).__state.matches.find((m: any) => m.bracketSlot === 'GRAND_FINAL' && m.round === 2);
		expect(reset).toBeUndefined();
		expect((db as any).__state.tournament.status).toBe('COMPLETED');
	});

	it('creates a bracket-reset match when the losers-bracket side wins game 1', async () => {
		const { gf, lbChampionId } = await playToGrandFinal();
		expect(gf.teamBId).toBe(lbChampionId);

		await recordMatchResult(gf.id, { winnerId: gf.teamBId });

		expect((db as any).__state.tournament.status).toBe('ONGOING');
		const reset = (db as any).__state.matches.find((m: any) => m.bracketSlot === 'GRAND_FINAL' && m.round === 2);
		expect(reset).toBeTruthy();
		expect([reset.teamAId, reset.teamBId].sort()).toEqual([gf.teamAId, gf.teamBId].sort());

		await recordMatchResult(reset.id, { winnerId: reset.teamAId });
		expect((db as any).__state.tournament.status).toBe('COMPLETED');
	});
});

describe('recordMatchResult — concurrency', () => {
	beforeEach(() => resetState(makeTeams(4)));

	it('lets exactly one of two concurrent completions with different winners win the race', async () => {
		const generated = generateSingleEliminationBracket(makeTeams(4));
		seed(generated);
		const match = findMatch(1, 'WINNERS', 0);

		const results = await Promise.allSettled([recordMatchResult(match.id, { winnerId: match.teamAId }), recordMatchResult(match.id, { winnerId: match.teamBId })]);

		const fulfilled = results.filter((r) => r.status === 'fulfilled');
		const rejected = results.filter((r) => r.status === 'rejected');
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
	});
});

describe('computeRoundRobinStandings', () => {
	it('ranks by wins then head-to-head then team id', async () => {
		const teams = makeTeams(4);
		resetState(teams);
		const generated = generateRoundRobinBracket(teams);
		seed(generated);

		const all = (db as any).__state.matches;
		const complete = async (a: number, b: number, winner: number) => {
			const m = all.find((x: any) => (x.teamAId === a && x.teamBId === b) || (x.teamAId === b && x.teamBId === a));
			await recordMatchResult(m.id, { winnerId: winner });
		};

		// Teams 1 & 2 both finish 2-1, but Team 1 beat Team 2 head-to-head.
		// Teams 3 & 4 both finish 1-2, with Team 3 beating Team 4 head-to-head.
		await complete(1, 2, 1);
		await complete(1, 3, 1);
		await complete(1, 4, 4);
		await complete(2, 3, 2);
		await complete(2, 4, 2);
		await complete(3, 4, 3);

		expect((db as any).__state.tournament.status).toBe('COMPLETED');

		const standings = await computeRoundRobinStandings(1);
		expect(standings.map((s) => s.teamId)).toEqual([1, 2, 3, 4]);
		expect(standings[0].wins).toBe(2);
		expect(standings[1].wins).toBe(2);
		expect(standings[2].wins).toBe(1);
		expect(standings[3].wins).toBe(1);
	});
});
