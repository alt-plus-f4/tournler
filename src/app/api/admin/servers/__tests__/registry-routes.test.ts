/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/permissions', () => ({ userHasPermission: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => true) }));
jest.mock('@/lib/cs2/server-pool', () => ({ getServerPool: jest.fn(), getEnvServerPool: jest.fn(() => []), recordServerHealth: jest.fn() }));
jest.mock('@/lib/cs2/rcon-client', () => ({ withRcon: jest.fn() }));
jest.mock('@/lib/cs2/fleet', () => {
	class FleetError extends Error {
		status: number;
		constructor(message: string, status = 400) {
			super(message);
			this.status = status;
		}
	}
	return { FleetError, createManagedServer: jest.fn(), removeServer: jest.fn(), powerServer: jest.fn(), importEnvServers: jest.fn(), agentTargetFor: jest.fn() };
});
jest.mock('@/lib/db', () => ({
	db: {
		cs2Server: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
		serverHost: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
	},
}));

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getServerPool } from '@/lib/cs2/server-pool';
import { createManagedServer, FleetError, importEnvServers, powerServer, removeServer } from '@/lib/cs2/fleet';
import { openSecret } from '@/lib/cs2/secret-box';
import { POST as registerPOST } from '../route';
import { PATCH as serverPATCH, DELETE as serverDELETE } from '../[serverId]/route';
import { POST as powerPOST } from '../[serverId]/power/route';
import { POST as importPOST } from '../import/route';
import { POST as hostsPOST } from '../../hosts/route';
import { DELETE as hostDELETE } from '../../hosts/[hostId]/route';
import { POST as hostServerPOST } from '../../hosts/[hostId]/servers/route';

const d = db as unknown as {
	cs2Server: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
	serverHost: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
};

const json = (method: string, body?: unknown) =>
	new Request('http://localhost/x', { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const server = (id: string) => ({ params: Promise.resolve({ serverId: id }) });
const host = (id: string) => ({ params: Promise.resolve({ hostId: id }) });

const VALID = { id: 'eu-1', ip: '93.184.216.34', port: 27015, rconPassword: 'super-secret-rcon' };

beforeEach(() => {
	jest.clearAllMocks();
	process.env.SERVER_SECRET_KEY = 'k'.repeat(40);
	(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });
	(userHasPermission as jest.Mock).mockResolvedValue(true);
	(getServerPool as jest.Mock).mockResolvedValue([]);
	d.serverHost.findMany.mockResolvedValue([]);
});

describe.each([
	['register', () => registerPOST(json('POST', VALID))],
	['patch', () => serverPATCH(json('PATCH', { status: 'DISABLED' }), server('eu-1'))],
	['delete', () => serverDELETE(json('DELETE'), server('eu-1'))],
	['power', () => powerPOST(json('POST', { action: 'stop' }), server('eu-1'))],
	['import', () => importPOST()],
	['create host', () => hostsPOST(json('POST', { slug: 'h', name: 'H', publicHost: 'h.example.com' }))],
	['delete host', () => hostDELETE(json('DELETE'), host('1'))],
	['create server on host', () => hostServerPOST(json('POST', {}), host('1'))],
])('%s authorization', (_name, call) => {
	it('401 without a session', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue(null);
		expect((await call()).status).toBe(401);
	});

	it('403 without servers:manage', async () => {
		(userHasPermission as jest.Mock).mockResolvedValue(false);
		expect((await call()).status).toBe(403);
		expect(userHasPermission).toHaveBeenCalledWith('u1', 'servers:manage');
	});
});

describe('POST /api/admin/servers (register)', () => {
	beforeEach(() => d.cs2Server.create.mockResolvedValue({ slug: 'eu-1' }));

	it('stores the server with the RCON password encrypted, never in the clear', async () => {
		const res = await registerPOST(json('POST', VALID));

		expect(res.status).toBe(201);
		const data = d.cs2Server.create.mock.calls[0][0].data;
		expect(data).toMatchObject({ slug: 'eu-1', ip: '93.184.216.34', port: 27015, rconHost: '93.184.216.34', rconPort: 27016, managed: false });
		expect(JSON.stringify(data)).not.toContain('super-secret-rcon');
		expect(openSecret(data.rconPasswordEnc)).toBe('super-secret-rcon');
		expect(JSON.stringify(await res.json())).not.toContain('super-secret-rcon');
	});

	it('refuses to store anything without SERVER_SECRET_KEY', async () => {
		delete process.env.SERVER_SECRET_KEY;
		expect((await registerPOST(json('POST', VALID))).status).toBe(409);
		expect(d.cs2Server.create).not.toHaveBeenCalled();
	});

	it('409 on a duplicate id or address', async () => {
		(getServerPool as jest.Mock).mockResolvedValue([{ id: 'eu-1', ip: '1.1.1.1', port: 1, rconHost: 'x', rconPort: 2, rconPassword: 'y' }]);
		expect((await registerPOST(json('POST', VALID))).status).toBe(409);
		expect(d.cs2Server.create).not.toHaveBeenCalled();
	});

	it('409 when the database unique constraint trips in a race', async () => {
		d.cs2Server.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
		expect((await registerPOST(json('POST', VALID))).status).toBe(409);
	});

	it('400 on invalid input and on private addresses in production', async () => {
		expect((await registerPOST(json('POST', { ...VALID, port: 70000 }))).status).toBe(400);
		expect((await registerPOST(json('POST', { ...VALID, rcon: 'x' }))).status).toBe(400);
		const env = process.env as Record<string, string | undefined>;
		const was = env.NODE_ENV;
		env.NODE_ENV = 'production';
		try {
			expect((await registerPOST(json('POST', { ...VALID, ip: '10.0.0.5' }))).status).toBe(400);
		} finally {
			env.NODE_ENV = was;
		}
	});
});

describe('PATCH /api/admin/servers/[serverId]', () => {
	beforeEach(() => d.cs2Server.findUnique.mockResolvedValue({ id: 3, slug: 'eu-1', host: null }));

	it('switches status', async () => {
		const res = await serverPATCH(json('PATCH', { status: 'DRAINING' }), server('eu-1'));
		expect(res.status).toBe(200);
		expect(d.cs2Server.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { status: 'DRAINING' } });
	});

	it('re-encrypts a replaced RCON password', async () => {
		await serverPATCH(json('PATCH', { rconPassword: 'new-secret-pw' }), server('eu-1'));
		const data = d.cs2Server.update.mock.calls[0][0].data;
		expect(JSON.stringify(data)).not.toContain('new-secret-pw');
		expect(openSecret(data.rconPasswordEnc)).toBe('new-secret-pw');
	});

	it('rejects unknown fields and invalid status; 404 for unregistered servers', async () => {
		expect((await serverPATCH(json('PATCH', { status: 'GONE' }), server('eu-1'))).status).toBe(400);
		expect((await serverPATCH(json('PATCH', { ip: '1.1.1.1' }), server('eu-1'))).status).toBe(400);
		d.cs2Server.findUnique.mockResolvedValue(null);
		expect((await serverPATCH(json('PATCH', { status: 'ACTIVE' }), server('nope'))).status).toBe(404);
		expect((await serverPATCH(json('PATCH', { status: 'ACTIVE' }), server('../x'))).status).toBe(400);
	});
});

describe('DELETE /api/admin/servers/[serverId] and power', () => {
	beforeEach(() => d.cs2Server.findUnique.mockResolvedValue({ id: 3, slug: 'eu-1', host: null }));

	it('deletes through the fleet service', async () => {
		expect((await serverDELETE(json('DELETE'), server('eu-1'))).status).toBe(200);
		expect(removeServer).toHaveBeenCalled();
	});

	it("passes the fleet service's refusal through (server in use)", async () => {
		(removeServer as jest.Mock).mockRejectedValue(new FleetError('A match is using this server.', 409));
		const res = await serverDELETE(json('DELETE'), server('eu-1'));
		expect(res.status).toBe(409);
		expect((await res.json()).error).toContain('match is using');
	});

	it('runs power actions and rejects unknown ones', async () => {
		(powerServer as jest.Mock).mockResolvedValue('running');
		const res = await powerPOST(json('POST', { action: 'restart' }), server('eu-1'));
		expect(res.status).toBe(200);
		expect(powerServer).toHaveBeenCalledWith(expect.anything(), 'restart');
		expect((await powerPOST(json('POST', { action: 'format-disk' }), server('eu-1'))).status).toBe(400);
	});
});

describe('POST /api/admin/servers/import', () => {
	it('imports the env fleet', async () => {
		(importEnvServers as jest.Mock).mockResolvedValue({ imported: 2, skipped: 0 });
		const res = await importPOST();
		expect(await res.json()).toEqual({ imported: 2, skipped: 0 });
	});

	it('needs the secret key first', async () => {
		delete process.env.SERVER_SECRET_KEY;
		expect((await importPOST()).status).toBe(409);
		expect(importEnvServers).not.toHaveBeenCalled();
	});
});

describe('hosts', () => {
	const input = { slug: 'fra', name: 'Frankfurt', publicHost: '93.184.216.34' };
	const created = {
		id: 1,
		slug: 'fra',
		name: 'Frankfurt',
		region: 'eu',
		publicHost: '93.184.216.34',
		agentUrl: null,
		agentSecretEnc: null,
		portRangeStart: 27015,
		portStep: 10,
		maxServers: 4,
		_count: { servers: 0 },
	};

	it('creates a host with a sealed agent secret and never echoes it', async () => {
		d.serverHost.create.mockResolvedValue({ ...created, agentUrl: 'https://93.184.216.34:8443', agentSecretEnc: 'sealed' });
		const res = await hostsPOST(json('POST', { ...input, agentUrl: 'https://93.184.216.34:8443', agentSecret: 'a-very-long-agent-secret-value' }));

		expect(res.status).toBe(201);
		const data = d.serverHost.create.mock.calls[0][0].data;
		expect(JSON.stringify(data)).not.toContain('a-very-long-agent-secret-value');
		expect(openSecret(data.agentSecretEnc)).toBe('a-very-long-agent-secret-value');
		const body = await res.json();
		expect(JSON.stringify(body)).not.toMatch(/agentSecret|sealed|a-very-long/);
		expect(body.host.hasAgent).toBe(true);
	});

	it('needs the agent URL and secret together', async () => {
		expect((await hostsPOST(json('POST', { ...input, agentUrl: 'https://93.184.216.34:8443' }))).status).toBe(400);
		expect((await hostsPOST(json('POST', { ...input, agentSecret: 'a-very-long-agent-secret-value' }))).status).toBe(400);
	});

	it('rejects non-https and private agent URLs in production', async () => {
		const env = process.env as Record<string, string | undefined>;
		const was = env.NODE_ENV;
		env.NODE_ENV = 'production';
		try {
			const secret = 'a-very-long-agent-secret-value';
			expect((await hostsPOST(json('POST', { ...input, agentUrl: 'http://93.184.216.34:8443', agentSecret: secret }))).status).toBe(400);
			expect((await hostsPOST(json('POST', { ...input, agentUrl: 'https://169.254.169.254', agentSecret: secret }))).status).toBe(400);
			expect((await hostsPOST(json('POST', { ...input, agentUrl: 'https://localhost:8443', agentSecret: secret }))).status).toBe(400);
			expect(d.serverHost.create).not.toHaveBeenCalled();
		} finally {
			env.NODE_ENV = was;
		}
	});

	it('rejects port steps under 10 (game, RCON and GOTV would collide)', async () => {
		expect((await hostsPOST(json('POST', { ...input, portStep: 5 }))).status).toBe(400);
	});

	it('will not delete a host that still has servers', async () => {
		d.serverHost.findUnique.mockResolvedValue({ ...created, _count: { servers: 2 } });
		expect((await hostDELETE(json('DELETE'), host('1'))).status).toBe(409);
		expect(d.serverHost.delete).not.toHaveBeenCalled();
		d.serverHost.findUnique.mockResolvedValue(created);
		expect((await hostDELETE(json('DELETE'), host('1'))).status).toBe(200);
	});

	it('creates a server on a host and returns its address', async () => {
		(createManagedServer as jest.Mock).mockResolvedValue({ slug: 'fra-1', ip: 'fra.example.com', port: 27015 });
		const res = await hostServerPOST(json('POST', { name: 'Match 1' }), host('1'));
		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ id: 'fra-1', address: 'fra.example.com:27015' });
		expect(createManagedServer).toHaveBeenCalledWith(1, { name: 'Match 1' });
	});

	it('surfaces agent failures as the fleet service reports them', async () => {
		(createManagedServer as jest.Mock).mockRejectedValue(new FleetError('Host agent is unreachable', 502));
		expect((await hostServerPOST(json('POST', {}), host('1'))).status).toBe(502);
		expect((await hostServerPOST(json('POST', {}), host('abc'))).status).toBe(400);
	});
});
