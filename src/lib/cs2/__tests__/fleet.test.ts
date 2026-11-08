/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/db', () => ({ db: { serverHost: { findUnique: jest.fn() }, cs2Server: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() }, gameServer: { findFirst: jest.fn() } } }));
jest.mock('../agent-client', () => {
	class AgentError extends Error {
		status: number | null;
		constructor(message: string, status: number | null) {
			super(message);
			this.status = status;
		}
	}
	return { AgentError, agentClient: { create: jest.fn(), remove: jest.fn(), power: jest.fn() } };
});

import { db } from '@/lib/db';
import { agentClient, AgentError } from '../agent-client';
import { openSecret, sealSecret } from '../secret-box';
import { createManagedServer, FleetError, isServerClaimed, pickSlot, portForIndex, powerServer, removeServer } from '../fleet';

const d = db as unknown as {
	serverHost: { findUnique: jest.Mock };
	cs2Server: { create: jest.Mock; delete: jest.Mock };
	gameServer: { findFirst: jest.Mock };
};
const agent = agentClient as unknown as Record<'create' | 'remove' | 'power', jest.Mock>;

const host = { id: 1, slug: 'eu-1', name: 'Frankfurt', region: 'eu', publicHost: 'fra.example.com', portRangeStart: 27015, portStep: 10, maxServers: 3 };

describe('pickSlot', () => {
	it('uses the first slot on an empty host', () => {
		expect(pickSlot(host, [])).toEqual({ index: 0, port: 27015, slug: 'eu-1-1' });
	});

	it('steps ports by portStep and reuses freed slots', () => {
		expect(pickSlot(host, [{ port: 27015, slug: 'eu-1-1' }])).toEqual({ index: 1, port: 27025, slug: 'eu-1-2' });
		expect(
			pickSlot(host, [
				{ port: 27015, slug: 'eu-1-1' },
				{ port: 27035, slug: 'eu-1-3' },
			]),
		).toEqual({ index: 1, port: 27025, slug: 'eu-1-2' });
	});

	it('reports a full host', () => {
		const full = [27015, 27025, 27035].map((port, i) => ({ port, slug: `eu-1-${i + 1}` }));
		expect(() => pickSlot(host, full)).toThrow(FleetError);
	});

	it('never walks past the top of the port range', () => {
		expect(() => pickSlot({ ...host, portRangeStart: 64995, maxServers: 5 }, [])).toThrow(/full/);
		expect(portForIndex(host, 2)).toBe(27035);
	});
});

describe('createManagedServer', () => {
	const sealedHost = () => ({ ...host, agentUrl: 'https://fra.example.com:8443', agentSecretEnc: sealSecret('a'.repeat(30)), servers: [] as { port: number; slug: string }[] });

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.SERVER_SECRET_KEY = 'k'.repeat(40);
		agent.create.mockResolvedValue({ slug: 'eu-1-1' });
		d.cs2Server.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 9, ...data }));
	});

	it('creates the container first, then registers the server with an encrypted RCON password', async () => {
		d.serverHost.findUnique.mockResolvedValue(sealedHost());

		const server = await createManagedServer(1, {});

		const spec = agent.create.mock.calls[0][1];
		expect(spec).toMatchObject({ slug: 'eu-1-1', gamePort: 27015, rconPort: 27016, tvPort: 27020 });
		expect(agent.create.mock.calls[0][0].agentUrl).toBe('https://fra.example.com:8443');
		const data = d.cs2Server.create.mock.calls[0][0].data;
		expect(data).toMatchObject({ slug: 'eu-1-1', ip: 'fra.example.com', port: 27015, rconPort: 27016, managed: true, hostId: 1 });
		expect(data.rconPasswordEnc).not.toContain(spec.rconPassword);
		expect(openSecret(data.rconPasswordEnc)).toBe(spec.rconPassword);
		expect(server.slug).toBe('eu-1-1');
	});

	it('removes the container again if registering it fails', async () => {
		d.serverHost.findUnique.mockResolvedValue(sealedHost());
		d.cs2Server.create.mockRejectedValue(new Error('db down'));
		agent.remove.mockResolvedValue({ removed: true });

		await expect(createManagedServer(1, {})).rejects.toThrow('db down');
		expect(agent.remove).toHaveBeenCalledWith(expect.anything(), 'eu-1-1');
	});

	it('registers nothing when the agent refuses', async () => {
		d.serverHost.findUnique.mockResolvedValue(sealedHost());
		agent.create.mockRejectedValue(new AgentError('The shared game files are not installed yet', 409));

		await expect(createManagedServer(1, {})).rejects.toMatchObject({ status: 409, message: expect.stringContaining('not installed') });
		expect(d.cs2Server.create).not.toHaveBeenCalled();
	});

	it('turns an unreachable agent into a 502', async () => {
		d.serverHost.findUnique.mockResolvedValue(sealedHost());
		agent.create.mockRejectedValue(new AgentError('Host agent is unreachable', null));

		await expect(createManagedServer(1, {})).rejects.toMatchObject({ status: 502 });
	});

	it('needs a host that has an agent', async () => {
		d.serverHost.findUnique.mockResolvedValue({ ...host, agentUrl: null, agentSecretEnc: null, servers: [] });
		await expect(createManagedServer(1, {})).rejects.toMatchObject({ status: 409 });
		d.serverHost.findUnique.mockResolvedValue(null);
		await expect(createManagedServer(2, {})).rejects.toMatchObject({ status: 404 });
	});
});

describe('removeServer / powerServer', () => {
	const row = (over = {}) =>
		({ id: 4, slug: 'eu-1-1', ip: 'fra.example.com', port: 27015, managed: true, host: { agentUrl: 'https://x.example.com', agentSecretEnc: sealSecret('a'.repeat(30)) }, ...over }) as never;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.SERVER_SECRET_KEY = 'k'.repeat(40);
		d.gameServer.findFirst.mockResolvedValue(null);
		agent.remove.mockResolvedValue({ removed: true });
		agent.power.mockResolvedValue({ state: 'running' });
	});

	it('refuses to remove or stop a server a match holds', async () => {
		d.gameServer.findFirst.mockResolvedValue({ id: 1 });
		await expect(removeServer(row())).rejects.toMatchObject({ status: 409 });
		await expect(powerServer(row(), 'stop')).rejects.toMatchObject({ status: 409 });
		await expect(powerServer(row(), 'restart')).rejects.toMatchObject({ status: 409 });
		expect(agent.remove).not.toHaveBeenCalled();
		expect(d.cs2Server.delete).not.toHaveBeenCalled();
	});

	it('removes the container then the row', async () => {
		await removeServer(row());
		expect(agent.remove).toHaveBeenCalledWith(expect.anything(), 'eu-1-1');
		expect(d.cs2Server.delete).toHaveBeenCalledWith({ where: { id: 4 } });
	});

	it('still deletes the row when the container is already gone (404)', async () => {
		agent.remove.mockRejectedValue(new AgentError('No such server', 404));
		await removeServer(row());
		expect(d.cs2Server.delete).toHaveBeenCalled();
	});

	it('keeps the row when the agent cannot be reached, so nothing is orphaned', async () => {
		agent.remove.mockRejectedValue(new AgentError('Host agent is unreachable', null));
		await expect(removeServer(row())).rejects.toMatchObject({ status: 502 });
		expect(d.cs2Server.delete).not.toHaveBeenCalled();
	});

	it('deletes hand-registered servers without calling any agent', async () => {
		await removeServer(row({ managed: false, host: null }));
		expect(agent.remove).not.toHaveBeenCalled();
		expect(d.cs2Server.delete).toHaveBeenCalled();
	});

	it('only controls power of agent-managed servers, and always allows start', async () => {
		await expect(powerServer(row({ managed: false }), 'start')).rejects.toMatchObject({ status: 409 });
		d.gameServer.findFirst.mockResolvedValue({ id: 1 });
		await expect(powerServer(row(), 'start')).resolves.toBe('running');
	});

	it('checks claims by registry id, and by address for pre-registry rows', async () => {
		await isServerClaimed({ id: 4, ip: '1.2.3.4', port: 27015 });
		expect(d.gameServer.findFirst.mock.calls[0][0].where.OR).toEqual([{ serverId: 4 }, { serverId: null, connectIp: '1.2.3.4', port: 27015 }]);
	});
});
