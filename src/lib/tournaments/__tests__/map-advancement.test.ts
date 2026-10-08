const recordMatchResult = jest.fn();
const state = {
	match: {} as any,
	maps: [] as any[],
};

jest.mock('../bracket-advancement', () => ({
	recordMatchResult: (...args: unknown[]) => recordMatchResult(...args),
	MatchResultConflictError: class MatchResultConflictError extends Error {},
}));

jest.mock('@/lib/db', () => {
	const tx = {
		matches: {
			findUniqueOrThrow: async () => ({ ...state.match, tournament: { bestOf: 3 } }),
			update: async ({ data }: any) => {
				Object.assign(state.match, data);
			},
		},
		matchMap: {
			findUniqueOrThrow: async ({ where }: any) => state.maps.find((m) => m.order === where.matchId_order.order),
			findMany: async () => state.maps.map((m) => ({ ...m })),
			update: async ({ where, data }: any) => {
				const row = state.maps.find((m) => m.id === where.id);
				for (const [k, v] of Object.entries(data)) if (v !== undefined) row[k] = v;
			},
		},
	};
	return { db: { $transaction: async (fn: any) => fn(tx) } };
});

import { recordMapResult } from '../map-advancement';

function seedBo3Pickup() {
	state.match = { id: 7, isPickup: true, bestOf: 3, status: 'LIVE', teamAId: null, teamBId: null, scoreTeamA: 0, scoreTeamB: 0 };
	state.maps = [0, 1, 2].map((order) => ({ id: order + 1, order, status: 'SCHEDULED', winnerId: null, winnerSide: null, startedAt: null }));
}

describe('recordMapResult', () => {
	beforeEach(() => {
		recordMatchResult.mockReset();
		seedBo3Pickup();
	});

	it('does not decide the series after one map of a bo3', async () => {
		await recordMapResult(7, 0, { winnerSide: 'TEAM_A', scoreTeamA: 13, scoreTeamB: 9 });
		expect(recordMatchResult).not.toHaveBeenCalled();
		expect(state.match.scoreTeamA).toBe(1);
	});

	it('decides the series once a side reaches two map wins', async () => {
		await recordMapResult(7, 0, { winnerSide: 'TEAM_A' });
		await recordMapResult(7, 1, { winnerSide: 'TEAM_A' });
		expect(recordMatchResult).toHaveBeenCalledTimes(1);
		expect(recordMatchResult).toHaveBeenCalledWith(7, expect.objectContaining({ winnerSide: 'TEAM_A', scoreTeamA: 2, scoreTeamB: 0 }));
	});

	it('finishes the series on a retry when the first delivery recorded the map but recordMatchResult failed', async () => {
		await recordMapResult(7, 0, { winnerSide: 'TEAM_A' });
		recordMatchResult.mockRejectedValueOnce(new Error('db blip'));
		await expect(recordMapResult(7, 1, { winnerSide: 'TEAM_A' })).rejects.toThrow('db blip');

		// MatchZy re-delivers the same map_result: the map row is already COMPLETED.
		await recordMapResult(7, 1, { winnerSide: 'TEAM_A' });
		expect(recordMatchResult).toHaveBeenCalledTimes(2);
		expect(recordMatchResult).toHaveBeenLastCalledWith(7, expect.objectContaining({ winnerSide: 'TEAM_A' }));
	});

	it('does not re-decide a series that is already completed', async () => {
		await recordMapResult(7, 0, { winnerSide: 'TEAM_A' });
		await recordMapResult(7, 1, { winnerSide: 'TEAM_A' });
		state.match.status = 'COMPLETED';
		recordMatchResult.mockClear();
		await recordMapResult(7, 1, { winnerSide: 'TEAM_A' });
		expect(recordMatchResult).not.toHaveBeenCalled();
	});
});
