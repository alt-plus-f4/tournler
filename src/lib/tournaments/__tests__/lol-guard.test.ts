/**
 * LoL match-flow guard, exercised through the real bracket-advancement entry points (not just the
 * choke-point unit in game-rules.test.ts): starting, pausing and completing a match for a LOL
 * tournament must never touch the CS2 server pool, MatchZy config push, or RCON — see
 * src/lib/tournaments/game-rules.ts and PRODUCT.md's "the server is the source of truth", which
 * only holds for CS2 in Phase 1.
 */
jest.mock('../game-server', () => ({
	ensureGameServer: jest.fn(),
	NoAvailableGameServerError: class NoAvailableGameServerError extends Error {},
}));
jest.mock('@/lib/cs2/provisioning', () => ({
	pushMatchConfigToServer: jest.fn().mockResolvedValue(undefined),
	pushRconCommand: jest.fn().mockResolvedValue(undefined),
	releaseGameServerAfterMatch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../veto', () => ({ getVetoState: jest.fn(() => ({ phase: 'COMPLETE' })) }));
jest.mock('../draft', () => ({ getDraftState: jest.fn(() => ({ phase: 'COMPLETE' })) }));
jest.mock('../tournament-service', () => ({ finalizeTournamentIfComplete: jest.fn().mockResolvedValue(undefined) }));

jest.mock('@/lib/db', () => {
	const state = { matches: new Map<number, any>() };

	function notFoundError() {
		const err: any = new Error('Record not found');
		err.code = 'P2025';
		return err;
	}

	const matchesApi = {
		findUniqueOrThrow: async ({ where }: any) => {
			const m = state.matches.get(where.id);
			if (!m) throw notFoundError();
			return { ...m };
		},
		findUnique: async ({ where }: any) => {
			const m = state.matches.get(where.id);
			return m ? { ...m } : null;
		},
		update: async ({ where, data }: any) => {
			const m = state.matches.get(where.id);
			if (!m) throw notFoundError();
			Object.assign(m, data);
			return { ...m };
		},
		updateMany: async ({ where, data }: any) => {
			let count = 0;
			for (const m of state.matches.values()) {
				if (where.id !== undefined && m.id !== where.id) continue;
				if (where.status?.not && m.status === where.status.not) continue;
				Object.assign(m, data);
				count++;
			}
			return { count };
		},
	};

	const fakeDb: any = {
		matches: matchesApi,
		$transaction: (fn: any) => fn(fakeDb),
	};
	fakeDb.__state = state;

	return { db: fakeDb };
});

import { db } from '@/lib/db';
import { ensureGameServer } from '../game-server';
import { pushMatchConfigToServer, pushRconCommand, releaseGameServerAfterMatch } from '@/lib/cs2/provisioning';
import { startMatch, pauseMatch, recordMatchResult } from '../bracket-advancement';

function seed(match: any) {
	(db as any).__state.matches.set(match.id, match);
}

const baseMatch = {
	id: 1,
	status: 'SCHEDULED',
	isPickup: false,
	pickupMode: null,
	teamAId: 10,
	teamBId: 20,
	winnerId: null,
	scoreTeamA: null,
	scoreTeamB: null,
	startedAt: null,
	pausedAt: null,
	completedAt: null,
	bestOf: 1,
	tournamentId: 1,
	mapActions: [],
	participants: [],
	draftPicks: [],
};

beforeEach(() => {
	(db as any).__state.matches.clear();
	jest.clearAllMocks();
});

describe('startMatch — LoL vs CS2', () => {
	it('marks a LoL match LIVE without provisioning a game server or pushing a MatchZy config', async () => {
		seed({ ...baseMatch, tournament: { id: 1, game: 'LOL' } });

		const result = await startMatch(1);

		expect(result.match.status).toBe('LIVE');
		expect(result.configPushError).toBeNull();
		expect(ensureGameServer).not.toHaveBeenCalled();
		expect(pushMatchConfigToServer).not.toHaveBeenCalled();
	});

	it('provisions a game server and pushes a MatchZy config for a CS2 match', async () => {
		(ensureGameServer as jest.Mock).mockResolvedValue({ gameServer: { id: 1 }, created: true });
		seed({ ...baseMatch, tournament: { id: 1, game: 'CS2', mapPool: ['de_dust2'], bestOf: 1 } });

		const result = await startMatch(1);

		expect(result.match.status).toBe('LIVE');
		expect(ensureGameServer).toHaveBeenCalledTimes(1);
		expect(pushMatchConfigToServer).toHaveBeenCalledWith(1);
	});
});

describe('pauseMatch — LoL vs CS2', () => {
	it('pauses a LoL match without sending an RCON command', async () => {
		seed({ ...baseMatch, status: 'LIVE', tournament: { id: 1, game: 'LOL' } });

		const result = await pauseMatch(1);

		expect(result.match.status).toBe('PAUSED');
		expect(pushRconCommand).not.toHaveBeenCalled();
	});

	it('pauses a CS2 match and sends css_forcepause over RCON', async () => {
		seed({ ...baseMatch, status: 'LIVE', tournament: { id: 1, game: 'CS2' } });

		await pauseMatch(1);

		expect(pushRconCommand).toHaveBeenCalledWith(1, 'css_forcepause');
	});
});

describe('recordMatchResult — LoL never releases a game server', () => {
	it('completes a LoL match without calling releaseGameServerAfterMatch', async () => {
		seed({ ...baseMatch, status: 'LIVE', tournament: { id: 1, game: 'LOL' } });

		await recordMatchResult(1, { winnerId: 10, scoreTeamA: 1, scoreTeamB: 0 });

		expect(releaseGameServerAfterMatch).not.toHaveBeenCalled();
	});

	it('completes a CS2 match and releases its game server', async () => {
		seed({ ...baseMatch, status: 'LIVE', tournament: { id: 1, game: 'CS2' } });

		await recordMatchResult(1, { winnerId: 10, scoreTeamA: 16, scoreTeamB: 10 });

		expect(releaseGameServerAfterMatch).toHaveBeenCalledWith(1);
	});
});
