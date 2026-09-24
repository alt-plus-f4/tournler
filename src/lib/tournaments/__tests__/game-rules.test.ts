/**
 * The LoL match-flow guard (Phase 1 — no hosted LoL servers, PRODUCT.md's "hosted servers, zero
 * setup" only holds for CS2): hostsGameServers/assertHostsGameServers/assertMatchHostsGameServer
 * are the single choke point every server-provisioning, RCON and veto/draft call goes through
 * (see src/lib/cs2/provisioning.ts, src/lib/tournaments/game-server.ts, game-state.ts, and the
 * veto/draft route handlers) — this test locks down that choke point directly, independent of
 * any one caller.
 */
jest.mock('@/lib/db', () => ({
	db: {
		matches: {
			findUniqueOrThrow: jest.fn(),
		},
	},
}));

import { db } from '@/lib/db';
import { assertHostsGameServers, assertMatchHostsGameServer, getMatchGame, hostsGameServers, HostedServerUnsupportedError } from '../game-rules';

describe('hostsGameServers', () => {
	it('is true only for CS2', () => {
		expect(hostsGameServers('CS2')).toBe(true);
		expect(hostsGameServers('LOL')).toBe(false);
	});
});

describe('assertHostsGameServers', () => {
	it('is a no-op for CS2', () => {
		expect(() => assertHostsGameServers('CS2', 'provision')).not.toThrow();
	});

	it('throws HostedServerUnsupportedError for LOL, naming the action and the game', () => {
		expect(() => assertHostsGameServers('LOL', 'provision')).toThrow(HostedServerUnsupportedError);
		try {
			assertHostsGameServers('LOL', 'provision');
			throw new Error('expected assertHostsGameServers to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(HostedServerUnsupportedError);
			const e = error as HostedServerUnsupportedError;
			expect(e.game).toBe('LOL');
			expect(e.message).toMatch(/League of Legends/);
			expect(e.message).toMatch(/provision/);
		}
	});
});

describe('getMatchGame / assertMatchHostsGameServer', () => {
	const findUniqueOrThrow = db.matches.findUniqueOrThrow as jest.Mock;

	beforeEach(() => findUniqueOrThrow.mockReset());

	it('reads the game off the match’s tournament', async () => {
		findUniqueOrThrow.mockResolvedValue({ tournament: { game: 'LOL' } });
		await expect(getMatchGame(db, 42)).resolves.toBe('LOL');
		expect(findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 42 }, select: { tournament: { select: { game: true } } } });
	});

	it('does not throw for a CS2 match', async () => {
		findUniqueOrThrow.mockResolvedValue({ tournament: { game: 'CS2' } });
		await expect(assertMatchHostsGameServer(db, 1, 'load a config onto')).resolves.toBeUndefined();
	});

	it('throws HostedServerUnsupportedError for a LoL match', async () => {
		findUniqueOrThrow.mockResolvedValue({ tournament: { game: 'LOL' } });
		await expect(assertMatchHostsGameServer(db, 1, 'load a config onto')).rejects.toThrow(HostedServerUnsupportedError);
	});
});
