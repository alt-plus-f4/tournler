/**
 * @jest-environment node
 */
jest.mock('@/lib/db', () => ({ db: { cs2Server: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } }));

import { db } from '@/lib/db';
import { sealSecret } from '../secret-box';
import { getEnvServerPool, getServerPool, getAllocatableServers, findServerByConnect, resolveGameServerTarget, recordServerHealth } from '../server-pool';

const cs2 = db.cs2Server as unknown as Record<'findMany' | 'findUnique' | 'update', jest.Mock>;

const ENV_KEYS = ['CS2_SERVER_POOL', 'CS2_SERVER_IP', 'GAME_SERVER_IP', 'CS2_SERVER_PORT', 'CS2_RCON_HOST', 'CS2_RCON_PORT', 'CS2_RCON_PASSWORD'] as const;

function clearEnv() {
	for (const key of ENV_KEYS) delete process.env[key];
}

function row(over: Partial<Record<string, unknown>> = {}) {
	return {
		id: 1,
		slug: 'eu-1',
		name: 'EU 1',
		hostId: null,
		ip: '1.2.3.4',
		port: 27015,
		rconHost: '1.2.3.4',
		rconPort: 27016,
		rconPasswordEnc: sealSecret('pw-1'),
		region: 'eu',
		status: 'ACTIVE',
		managed: false,
		lastSeenAt: null,
		lastHealthy: null,
		lastError: null,
		...over,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	process.env.SERVER_SECRET_KEY = 'k'.repeat(40);
	cs2.findMany.mockResolvedValue([]);
});

describe('getEnvServerPool (legacy env fleet)', () => {
	afterEach(clearEnv);

	it('parses CS2_SERVER_POOL into a list of server configs', () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([
			{ id: '01', ip: '1.2.3.4', port: 27015, rconPort: 27016, rconPassword: 'pw1' },
			{ id: '02', ip: '1.2.3.4', port: 27025, rconPort: 27026, rconPassword: 'pw2' },
		]);

		const pool = getEnvServerPool();
		expect(pool).toHaveLength(2);
		expect(pool[0]).toEqual({ id: '01', ip: '1.2.3.4', port: 27015, rconHost: '1.2.3.4', rconPort: 27016, rconPassword: 'pw1' });
		expect(pool[1].id).toBe('02');
	});

	it('defaults rconHost to ip and rconPort to port+1 when omitted', () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([{ id: '01', ip: '1.2.3.4', port: 27015, rconPassword: 'pw1' }]);

		const pool = getEnvServerPool();
		expect(pool[0].rconHost).toBe('1.2.3.4');
		expect(pool[0].rconPort).toBe(27016);
	});

	it('throws on invalid JSON', () => {
		process.env.CS2_SERVER_POOL = 'not json';
		expect(() => getEnvServerPool()).toThrow('CS2_SERVER_POOL is not valid JSON');
	});

	it('falls back to a single server built from CS2_SERVER_IP/PORT/RCON vars when CS2_SERVER_POOL is unset', () => {
		process.env.CS2_SERVER_IP = 'example.com';
		process.env.CS2_SERVER_PORT = '27015';
		process.env.CS2_RCON_HOST = 'example.com';
		process.env.CS2_RCON_PORT = '27016';
		process.env.CS2_RCON_PASSWORD = 'secret';

		expect(getEnvServerPool()).toEqual([{ id: 'default', ip: 'example.com', port: 27015, rconHost: 'example.com', rconPort: 27016, rconPassword: 'secret' }]);
	});

	it('returns an empty pool when nothing is configured', () => {
		expect(getEnvServerPool()).toEqual([]);
	});
});

describe('getServerPool', () => {
	afterEach(clearEnv);

	it('reads the registry and decrypts each RCON password', async () => {
		cs2.findMany.mockResolvedValue([row(), row({ id: 2, slug: 'eu-2', port: 27025, rconPort: 27026, rconPasswordEnc: sealSecret('pw-2') })]);

		const pool = await getServerPool();
		expect(pool.map((s) => [s.id, s.dbId, s.rconPassword])).toEqual([
			['eu-1', 1, 'pw-1'],
			['eu-2', 2, 'pw-2'],
		]);
	});

	it('falls back to the env fleet while the registry is empty', async () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([{ id: '01', ip: '1.2.3.4', port: 27015, rconPassword: 'pw1' }]);

		const pool = await getServerPool();
		expect(pool).toHaveLength(1);
		expect(pool[0].dbId).toBeUndefined();
	});

	it('ignores the env fleet once the registry has servers', async () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([{ id: '01', ip: '9.9.9.9', port: 1, rconPassword: 'x' }]);
		cs2.findMany.mockResolvedValue([row()]);

		expect((await getServerPool()).map((s) => s.ip)).toEqual(['1.2.3.4']);
	});

	it('throws when a stored password cannot be decrypted (wrong key)', async () => {
		cs2.findMany.mockResolvedValue([row()]);
		process.env.SERVER_SECRET_KEY = 'z'.repeat(40);

		await expect(getServerPool()).rejects.toThrow('SERVER_SECRET_KEY');
	});
});

describe('getAllocatableServers', () => {
	afterEach(clearEnv);

	it('skips disabled, draining and known-unhealthy servers, and prefers known-healthy ones', async () => {
		cs2.findMany.mockResolvedValue([
			row({ id: 1, slug: 'a', port: 1, lastHealthy: null }),
			row({ id: 2, slug: 'b', port: 2, status: 'DRAINING' }),
			row({ id: 3, slug: 'c', port: 3, status: 'DISABLED' }),
			row({ id: 4, slug: 'd', port: 4, lastHealthy: false }),
			row({ id: 5, slug: 'e', port: 5, lastHealthy: true }),
		]);

		const { configured, servers } = await getAllocatableServers(db as never);
		expect(configured).toBe(5);
		expect(servers.map((s) => s.id)).toEqual(['e', 'a']);
	});

	it('tries a server again once its failed check is old enough', async () => {
		const stale = new Date(Date.now() - 11 * 60_000);
		const fresh = new Date(Date.now() - 60_000);
		cs2.findMany.mockResolvedValue([row({ id: 1, slug: 'old-fail', port: 1, lastHealthy: false, updatedAt: stale }), row({ id: 2, slug: 'new-fail', port: 2, lastHealthy: false, updatedAt: fresh })]);

		const { servers } = await getAllocatableServers(db as never);
		expect(servers.map((s) => s.id)).toEqual(['old-fail']);
	});

	it('uses the env fleet when the registry is empty', async () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([{ id: '01', ip: '1.2.3.4', port: 27015, rconPassword: 'pw1' }]);

		const { configured, servers } = await getAllocatableServers(db as never);
		expect(configured).toBe(1);
		expect(servers[0].id).toBe('01');
	});

	it('reports nothing configured when both are empty', async () => {
		expect(await getAllocatableServers(db as never)).toEqual({ configured: 0, servers: [] });
	});
});

describe('findServerByConnect / resolveGameServerTarget', () => {
	afterEach(clearEnv);

	it('finds a server by its public address', async () => {
		cs2.findMany.mockResolvedValue([row(), row({ id: 2, slug: 'eu-2', port: 27025 })]);

		expect((await findServerByConnect('1.2.3.4', 27025))?.id).toBe('eu-2');
		expect(await findServerByConnect('1.2.3.4', 27099)).toBeUndefined();
	});

	it('resolves by registry id first, even if the address was edited since', async () => {
		cs2.findUnique.mockResolvedValue(row({ id: 7, slug: 'moved', ip: '5.6.7.8' }));

		const server = await resolveGameServerTarget({ serverId: 7, connectIp: '1.2.3.4', port: 27015 });
		expect(server?.id).toBe('moved');
		expect(cs2.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
	});

	it('falls back to the address for rows from before the registry', async () => {
		cs2.findMany.mockResolvedValue([row()]);

		const server = await resolveGameServerTarget({ serverId: null, connectIp: '1.2.3.4', port: 27015 });
		expect(server?.id).toBe('eu-1');
		expect(cs2.findUnique).not.toHaveBeenCalled();
	});
});

describe('recordServerHealth', () => {
	it('stores healthy results and stamps lastSeenAt', async () => {
		cs2.update.mockResolvedValue({});
		await recordServerHealth(3, { healthy: true });
		const data = cs2.update.mock.calls[0][0].data;
		expect(data.lastHealthy).toBe(true);
		expect(data.lastError).toBeNull();
		expect(data.lastSeenAt).toBeInstanceOf(Date);
	});

	it('stores the failure reason and leaves lastSeenAt alone', async () => {
		cs2.update.mockResolvedValue({});
		await recordServerHealth(3, { healthy: false, error: 'connection refused' });
		const data = cs2.update.mock.calls[0][0].data;
		expect(data).toMatchObject({ lastHealthy: false, lastError: 'connection refused', lastSeenAt: undefined });
	});

	it('does nothing for env-only servers', async () => {
		await recordServerHealth(undefined, { healthy: true });
		expect(cs2.update).not.toHaveBeenCalled();
	});
});
