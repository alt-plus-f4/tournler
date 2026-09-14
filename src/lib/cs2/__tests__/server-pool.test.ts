import { getServerPool, findServerByConnect } from '../server-pool';

const ENV_KEYS = ['CS2_SERVER_POOL', 'CS2_SERVER_IP', 'GAME_SERVER_IP', 'CS2_SERVER_PORT', 'CS2_RCON_HOST', 'CS2_RCON_PORT', 'CS2_RCON_PASSWORD'] as const;

function clearEnv() {
	for (const key of ENV_KEYS) delete process.env[key];
}

describe('getServerPool', () => {
	afterEach(clearEnv);

	it('parses CS2_SERVER_POOL into a list of server configs', () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([
			{ id: '01', ip: '1.2.3.4', port: 27015, rconPort: 27016, rconPassword: 'pw1' },
			{ id: '02', ip: '1.2.3.4', port: 27025, rconPort: 27026, rconPassword: 'pw2' },
		]);

		const pool = getServerPool();
		expect(pool).toHaveLength(2);
		expect(pool[0]).toEqual({ id: '01', ip: '1.2.3.4', port: 27015, rconHost: '1.2.3.4', rconPort: 27016, rconPassword: 'pw1' });
		expect(pool[1].id).toBe('02');
	});

	it('defaults rconHost to ip and rconPort to port+1 when omitted', () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([{ id: '01', ip: '1.2.3.4', port: 27015, rconPassword: 'pw1' }]);

		const pool = getServerPool();
		expect(pool[0].rconHost).toBe('1.2.3.4');
		expect(pool[0].rconPort).toBe(27016);
	});

	it('throws on invalid JSON', () => {
		process.env.CS2_SERVER_POOL = 'not json';
		expect(() => getServerPool()).toThrow('CS2_SERVER_POOL is not valid JSON');
	});

	it('falls back to a single-server pool built from CS2_SERVER_IP/PORT/RCON vars when CS2_SERVER_POOL is unset', () => {
		process.env.CS2_SERVER_IP = 'example.com';
		process.env.CS2_SERVER_PORT = '27015';
		process.env.CS2_RCON_HOST = 'example.com';
		process.env.CS2_RCON_PORT = '27016';
		process.env.CS2_RCON_PASSWORD = 'secret';

		const pool = getServerPool();
		expect(pool).toEqual([{ id: 'default', ip: 'example.com', port: 27015, rconHost: 'example.com', rconPort: 27016, rconPassword: 'secret' }]);
	});

	it('returns an empty pool when nothing is configured', () => {
		expect(getServerPool()).toEqual([]);
	});
});

describe('findServerByConnect', () => {
	afterEach(clearEnv);

	it('finds the pool entry matching a connectIp/port pair', () => {
		process.env.CS2_SERVER_POOL = JSON.stringify([
			{ id: '01', ip: '1.2.3.4', port: 27015, rconPort: 27016, rconPassword: 'pw1' },
			{ id: '02', ip: '1.2.3.4', port: 27025, rconPort: 27026, rconPassword: 'pw2' },
		]);

		expect(findServerByConnect('1.2.3.4', 27025)?.id).toBe('02');
		expect(findServerByConnect('1.2.3.4', 27099)).toBeUndefined();
	});
});
