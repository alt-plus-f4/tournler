/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/permissions', () => ({ userHasPermission: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => true) }));
jest.mock('@/lib/cs2/server-pool', () => ({ getServerPool: jest.fn() }));
jest.mock('@/lib/cs2/rcon-client', () => ({ withRcon: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: { gameServer: { findMany: jest.fn(), findFirst: jest.fn() } } }));

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { checkRateLimit } from '@/lib/rate-limit';
import { getServerPool } from '@/lib/cs2/server-pool';
import { withRcon } from '@/lib/cs2/rcon-client';
import { clearLiveStatusCache } from '@/lib/cs2/server-live';
import { GET as listGET } from '../route';
import { GET as detailGET } from '../[serverId]/route';
import { POST as rconPOST } from '../[serverId]/rcon/route';
import { PATCH as settingsPATCH } from '../[serverId]/settings/route';

const gs = db.gameServer as unknown as Record<'findMany' | 'findFirst', jest.Mock>;
const execute = jest.fn();

const POOL = [
	{ id: '01', ip: '1.2.3.4', port: 27015, rconHost: 'internal-host', rconPort: 27016, rconPassword: 'super-secret-rcon' },
	{ id: '02', ip: '1.2.3.4', port: 27025, rconHost: 'internal-host', rconPort: 27026, rconPassword: 'other-secret-rcon' },
];
const STATUS = 'hostname: Tournler #1\nversion : 1.40.2.3/14023\nplayers : 2 humans, 0 bots (10 max)\nloaded spawngroup(  1)  : SV:  [1: de_dust2 | main lump | mapload]';
const activeRow = {
	id: 5,
	status: 'RUNNING',
	matchConfigLoadedAt: new Date('2026-01-01T10:00:00Z'),
	password: 'match-pw',
	connectIp: '1.2.3.4',
	port: 27015,
	match: { id: 7, status: 'LIVE', matchDate: new Date('2026-01-01T09:00:00Z'), teamAName: null, teamBName: null, teamA: { name: 'Alpha' }, teamB: { name: 'Bravo' }, tournament: { name: 'Cup' } },
};

const ctx = (id: string) => ({ params: Promise.resolve({ serverId: id }) });
const json = (body: unknown) => new Request('http://localhost/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const patch = (body: unknown) => new Request('http://localhost/x', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => {
	jest.clearAllMocks();
	clearLiveStatusCache();
	(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });
	(userHasPermission as jest.Mock).mockResolvedValue(true);
	(checkRateLimit as jest.Mock).mockReturnValue(true);
	(getServerPool as jest.Mock).mockReturnValue(POOL);
	execute.mockImplementation(async (cmd: string) => (cmd === 'status' ? STATUS : `"${cmd}" = "30" ( def. "0" )`));
	(withRcon as jest.Mock).mockImplementation(async (_t: unknown, fn: (r: { execute: jest.Mock }) => unknown) => fn({ execute }));
	gs.findMany.mockResolvedValue([activeRow]);
	gs.findFirst.mockResolvedValue(activeRow);
});

describe.each([
	['GET list', () => listGET(new Request('http://localhost/api/admin/servers'))],
	['GET detail', () => detailGET(new Request('http://localhost/x'), ctx('01'))],
	['POST rcon', () => rconPOST(json({ command: 'status' }), ctx('01'))],
	['PATCH settings', () => settingsPATCH(patch({ settings: { mp_maxrounds: 24 } }), ctx('01'))],
])('%s authorization', (_name, call) => {
	it('401 without a session', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue(null);
		expect((await call()).status).toBe(401);
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('403 without servers:manage', async () => {
		(userHasPermission as jest.Mock).mockResolvedValue(false);
		expect((await call()).status).toBe(403);
		expect(userHasPermission).toHaveBeenCalledWith('u1', 'servers:manage');
		expect(withRcon).not.toHaveBeenCalled();
	});
});

describe('GET /api/admin/servers', () => {
	it('lists pool servers with live status, match summary and no secrets', async () => {
		const res = await listGET(new Request('http://localhost/api/admin/servers'));
		expect(res.status).toBe(200);
		expect(res.headers.get('Cache-Control')).toBe('no-store');
		const text = JSON.stringify(await res.clone().json());
		expect(text).not.toContain('super-secret-rcon');
		expect(text).not.toContain('internal-host');
		expect(text).not.toContain('match-pw');
		const body = await res.json();
		expect(body.servers).toHaveLength(2);
		expect(body.servers[0]).toMatchObject({
			id: '01',
			address: '1.2.3.4:27015',
			status: { online: true, hostname: 'Tournler #1', map: 'de_dust2', humans: 2, bots: 0 },
			match: { matchId: 7, teamA: 'Alpha', teamB: 'Bravo' },
		});
		expect(body.servers[1].match).toBeNull();
		expect(body.summary).toEqual({ total: 2, online: 2, offline: 0, inUse: 1, free: 1 });
	});

	it('marks a server offline with a short reason when RCON fails', async () => {
		(withRcon as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:27016\n    at stack'));
		const body = await (await listGET(new Request('http://localhost/api/admin/servers'))).json();
		expect(body.servers[0].status).toMatchObject({ online: false, reason: 'RCON refused' });
		expect(JSON.stringify(body)).not.toContain('stack');
		expect(body.summary).toMatchObject({ online: 0, offline: 2 });
	});

	it('caches live status briefly so repeated calls do not hit RCON again', async () => {
		await listGET(new Request('http://localhost/api/admin/servers'));
		const calls = (withRcon as jest.Mock).mock.calls.length;
		await listGET(new Request('http://localhost/api/admin/servers'));
		expect((withRcon as jest.Mock).mock.calls.length).toBe(calls);
	});

	it('returns an empty list when no servers are configured', async () => {
		(getServerPool as jest.Mock).mockReturnValue([]);
		const body = await (await listGET(new Request('http://localhost/api/admin/servers'))).json();
		expect(body.servers).toEqual([]);
		expect(body.summary.total).toBe(0);
		expect(gs.findMany).not.toHaveBeenCalled();
	});

	it('flags a malformed pool without throwing', async () => {
		(getServerPool as jest.Mock).mockImplementation(() => {
			throw new Error('CS2_SERVER_POOL is not valid JSON');
		});
		const res = await listGET(new Request('http://localhost/api/admin/servers'));
		expect(res.status).toBe(200);
		expect((await res.json()).poolError).toBe(true);
	});
});

describe('GET /api/admin/servers/[serverId]', () => {
	it('returns status, raw output, settings and the current match with its password', async () => {
		const res = await detailGET(new Request('http://localhost/x'), ctx('01'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.raw).toContain('hostname: Tournler #1');
		expect(body.settings.mp_maxrounds).toBe('30');
		expect(body.settings).not.toHaveProperty('sv_password');
		expect(body.current).toMatchObject({ matchId: 7, password: 'match-pw' });
		expect(JSON.stringify(body)).not.toContain('super-secret-rcon');
		expect(execute).not.toHaveBeenCalledWith('sv_password');
	});

	it('404 for an id not in the pool and 400 for a malformed id; never connects', async () => {
		expect((await detailGET(new Request('http://localhost/x'), ctx('nope'))).status).toBe(404);
		expect((await detailGET(new Request('http://localhost/x'), ctx('10.0.0.1:27015/../x'))).status).toBe(400);
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('429 when rate limited', async () => {
		(checkRateLimit as jest.Mock).mockReturnValue(false);
		expect((await detailGET(new Request('http://localhost/x'), ctx('01'))).status).toBe(429);
	});
});

describe('POST /api/admin/servers/[serverId]/rcon', () => {
	it('runs the command on the pool server and returns output', async () => {
		execute.mockResolvedValue('Server: Running');
		const res = await rconPOST(json({ command: 'status' }), ctx('01'));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true, output: 'Server: Running' });
		expect(withRcon).toHaveBeenCalledWith({ host: 'internal-host', port: 27016, password: 'super-secret-rcon' }, expect.any(Function));
		expect(checkRateLimit).toHaveBeenCalledWith('admin-servers-rcon:u1', 30, 60_000);
	});

	it('redacts RCON passwords from output', async () => {
		execute.mockResolvedValue('leak super-secret-rcon and other-secret-rcon');
		const body = await (await rconPOST(json({ command: 'cvarlist' }), ctx('01'))).json();
		expect(body.output).toBe('leak [redacted] and [redacted]');
	});

	it('rejects empty, too long, control-character and rcon_password commands', async () => {
		expect((await rconPOST(json({ command: '   ' }), ctx('01'))).status).toBe(400);
		expect((await rconPOST(json({ command: 'x'.repeat(513) }), ctx('01'))).status).toBe(400);
		expect((await rconPOST(json({ command: 'status\nquit' }), ctx('01'))).status).toBe(400);
		expect((await rconPOST(json({ command: 'rcon_password hacked' }), ctx('01'))).status).toBe(400);
		expect((await rconPOST(json({}), ctx('01'))).status).toBe(400);
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('429 when rate limited and 404 for an unknown server', async () => {
		(checkRateLimit as jest.Mock).mockReturnValue(false);
		expect((await rconPOST(json({ command: 'status' }), ctx('01'))).status).toBe(429);
		(checkRateLimit as jest.Mock).mockReturnValue(true);
		expect((await rconPOST(json({ command: 'status' }), ctx('99'))).status).toBe(404);
	});

	it('returns a generic error without internals when RCON fails', async () => {
		(withRcon as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED internal-host:27016 super-secret-rcon'));
		const res = await rconPOST(json({ command: 'status' }), ctx('01'));
		expect(res.status).toBe(502);
		const text = JSON.stringify(await res.json());
		expect(text).toContain('RCON refused');
		expect(text).not.toContain('internal-host');
		expect(text).not.toContain('super-secret-rcon');
	});
});

describe('PATCH /api/admin/servers/[serverId]/settings', () => {
	it('applies allowlisted settings as individual console commands', async () => {
		const res = await settingsPATCH(patch({ settings: { mp_maxrounds: 24, hostname: 'My Server', sv_password: 'pw123', sv_cheats: false } }), ctx('01'));
		expect(res.status).toBe(200);
		expect(execute.mock.calls.map((c) => c[0])).toEqual(['mp_maxrounds 24', 'hostname "My Server"', 'sv_password "pw123"', 'sv_cheats 0']);
		expect(JSON.stringify(await res.json())).not.toContain('pw123');
	});

	it('rejects non-allowlisted cvars and injection attempts without touching the server', async () => {
		for (const settings of [{ rcon_password: 'x' }, { hostname: 'a; rcon_password pwn' }, { hostname: 'a"b' }, { hostname: 'a\nquit' }, { mp_maxrounds: 500 }, { bot_quota_mode: 'fill; quit' }, {}]) {
			expect((await settingsPATCH(patch({ settings }), ctx('01'))).status).toBe(400);
		}
		expect((await settingsPATCH(patch({ nope: 1 }), ctx('01'))).status).toBe(400);
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('does not log password values', async () => {
		const info = jest.spyOn(console, 'info').mockImplementation(() => {});
		await settingsPATCH(patch({ settings: { sv_password: 'topsecretpw' } }), ctx('01'));
		expect(JSON.stringify(info.mock.calls)).not.toContain('topsecretpw');
		info.mockRestore();
	});

	it('404 for an unknown server and 502 with a generic reason when RCON fails', async () => {
		expect((await settingsPATCH(patch({ settings: { mp_maxrounds: 1 } }), ctx('zz'))).status).toBe(404);
		(withRcon as jest.Mock).mockRejectedValue(new Error('timed out'));
		const res = await settingsPATCH(patch({ settings: { mp_maxrounds: 1 } }), ctx('01'));
		expect(res.status).toBe(502);
		expect((await res.json()).error).toContain('Timed out');
	});
});

describe('POST /api/admin/servers/test and /preview', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { POST: testPOST } = require('../test/route');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { POST: previewPOST } = require('../preview/route');
	const entry = { id: '03', ip: '8.8.8.8', port: 27035, rconPassword: 'typed-secret' };

	it('401/403/429 guards', async () => {
		(getAuthSession as jest.Mock).mockResolvedValueOnce(null);
		expect((await testPOST(json(entry))).status).toBe(401);
		(userHasPermission as jest.Mock).mockResolvedValueOnce(false);
		expect((await previewPOST(json(entry))).status).toBe(403);
		(checkRateLimit as jest.Mock).mockReturnValueOnce(false);
		expect((await testPOST(json(entry))).status).toBe(429);
		expect(checkRateLimit).toHaveBeenCalledWith('admin-servers-test:u1', 10, 60_000);
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('test: validates every field before connecting', async () => {
		for (const bad of [
			{ ...entry, port: 0 },
			{ ...entry, port: 70000 },
			{ ...entry, rconPort: 99999 },
			{ ...entry, rconPassword: '' },
			{ ...entry, ip: 'http://x' },
			{ ...entry, id: '' },
			{ port: 1 },
		]) {
			expect((await testPOST(json(bad))).status).toBe(400);
		}
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('test: rejects private targets in production without connecting', async () => {
		const env = process.env as Record<string, string | undefined>;
		const prev = env.NODE_ENV;
		env.NODE_ENV = 'production';
		try {
			for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', 'localhost']) {
				const res = await testPOST(json({ ...entry, ip }));
				expect(res.status).toBe(400);
			}
			expect((await testPOST(json({ ...entry, ip: '8.8.8.8', rconHost: '192.168.0.1' }))).status).toBe(400);
			expect(withRcon).not.toHaveBeenCalled();
		} finally {
			env.NODE_ENV = prev;
		}
	});

	it('test: returns status without echoing the password and never logs it', async () => {
		const info = jest.spyOn(console, 'info').mockImplementation(() => {});
		const res = await testPOST(json(entry));
		const text = JSON.stringify(await res.json());
		expect(text).toContain('de_dust2');
		expect(text).not.toContain('typed-secret');
		expect(JSON.stringify(info.mock.calls)).not.toContain('typed-secret');
		expect(withRcon).toHaveBeenCalledWith({ host: '8.8.8.8', port: 27036, password: 'typed-secret' }, expect.any(Function));
		info.mockRestore();
	});

	it('test: reports a short reason when the connection fails', async () => {
		(withRcon as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'));
		const body = await (await testPOST(json(entry))).json();
		expect(body).toMatchObject({ online: false, reason: 'RCON refused' });
	});

	it('preview: merges the pool without any existing password', async () => {
		const res = await previewPOST(json({ ...entry, ip: '5.6.7.8', port: 27035 }));
		expect(res.status).toBe(200);
		const text = JSON.stringify(await res.json());
		expect(text).not.toContain('super-secret-rcon');
		expect(text).not.toContain('other-secret-rcon');
		expect(text).toContain('<keep existing>');
		expect(withRcon).not.toHaveBeenCalled();
	});

	it('preview: 409 on duplicate id', async () => {
		expect((await previewPOST(json({ ...entry, id: '01' }))).status).toBe(409);
	});
});

describe('GET /api/admin/servers/[serverId]/status and ?fresh=1', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { GET: statusGET } = require('../[serverId]/status/route');

	it('re-checks one server bypassing the cache', async () => {
		await statusGET(new Request('http://localhost/x'), ctx('01'));
		await statusGET(new Request('http://localhost/x'), ctx('01'));
		expect(withRcon).toHaveBeenCalledTimes(2);
		expect((await statusGET(new Request('http://localhost/x'), ctx('nope'))).status).toBe(404);
	});

	it('list ?fresh=1 bypasses cache and is rate limited', async () => {
		await listGET(new Request('http://localhost/api/admin/servers'));
		const calls = (withRcon as jest.Mock).mock.calls.length;
		await listGET(new Request('http://localhost/api/admin/servers?fresh=1'));
		expect((withRcon as jest.Mock).mock.calls.length).toBe(calls + 2);
		expect(checkRateLimit).toHaveBeenCalledWith('admin-servers-fresh:u1', 12, 60_000);
	});
});
