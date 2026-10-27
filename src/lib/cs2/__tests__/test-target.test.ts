/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('dns', () => ({ __esModule: true, default: { promises: { lookup: jest.fn() } } }));

import dns from 'dns';
import { checkTestHost } from '../test-target';

const lookup = dns.promises.lookup as unknown as jest.Mock;
const POOL = [{ ip: 'localhost', rconHost: 'host.docker.internal' }];

beforeEach(() => lookup.mockReset());

describe('checkTestHost in production', () => {
	const prod = (host: string, pool = POOL) => checkTestHost(host, pool, 'production');

	it.each(['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '172.16.0.1', '::1', 'fe80::1', '0.0.0.0', 'localhost2.localhost', 'db.internal', 'printer.local'])('rejects %s', async (host) => {
		expect((await prod(host, [])).ok).toBe(false);
	});

	it('rejects a public name that resolves to a private address (including mixed answers)', async () => {
		lookup.mockResolvedValueOnce([{ address: '10.0.0.9', family: 4 }]);
		expect((await prod('evil.example.com', [])).ok).toBe(false);
		lookup.mockResolvedValueOnce([
			{ address: '8.8.8.8', family: 4 },
			{ address: '127.0.0.1', family: 4 },
		]);
		expect((await prod('mixed.example.com', [])).ok).toBe(false);
	});

	it('rejects when DNS fails', async () => {
		lookup.mockRejectedValueOnce(new Error('ENOTFOUND'));
		expect((await prod('nope.example.com', [])).ok).toBe(false);
	});

	it('allows public IPs and pins the resolved address for names', async () => {
		expect(await prod('8.8.8.8', [])).toEqual({ ok: true, address: '8.8.8.8' });
		lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
		expect(await prod('cs2.example.com', [])).toEqual({ ok: true, address: '93.184.216.34' });
	});

	it('allows private hosts that the pool already uses', async () => {
		expect(await prod('localhost')).toEqual({ ok: true, address: 'localhost' });
		expect(await prod('Host.Docker.Internal')).toMatchObject({ ok: true });
		expect((await prod('127.0.0.1')).ok).toBe(false);
	});
});

describe('checkTestHost outside production', () => {
	it('allows local targets for dev', async () => {
		expect(await checkTestHost('127.0.0.1', [], 'development')).toEqual({ ok: true, address: '127.0.0.1' });
		expect((await checkTestHost('localhost', [], 'test')).ok).toBe(true);
	});
});
