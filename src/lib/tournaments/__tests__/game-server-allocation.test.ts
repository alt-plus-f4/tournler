/**
 * @jest-environment node
 */
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/cs2/server-pool', () => ({ getAllocatableServers: jest.fn() }));
jest.mock('../game-rules', () => ({ assertMatchHostsGameServer: jest.fn() }));

import { getAllocatableServers } from '@/lib/cs2/server-pool';
import { ensureGameServer, NoAvailableGameServerError } from '../game-server';

const allocatable = getAllocatableServers as jest.Mock;

const srv = (dbId: number | undefined, id: string, port: number) => ({ dbId, id, ip: '1.2.3.4', port, rconHost: '1.2.3.4', rconPort: port + 1, rconPassword: 'x' });

function makeTx(opts: { existing?: unknown; claimed?: { serverId: number | null; connectIp: string; port: number }[] }) {
	return {
		$executeRaw: jest.fn(),
		gameServer: {
			findUnique: jest.fn().mockResolvedValue(opts.existing ?? null),
			findMany: jest.fn().mockResolvedValue(opts.claimed ?? []),
			create: jest.fn().mockImplementation(async ({ data }: { data: object }) => ({ id: 1, ...data })),
		},
	};
}

beforeEach(() => jest.clearAllMocks());

describe('ensureGameServer allocation', () => {
	it('takes the first server no unfinished match holds and records its registry id', async () => {
		allocatable.mockResolvedValue({ configured: 3, servers: [srv(1, 'a', 27015), srv(2, 'b', 27025), srv(3, 'c', 27035)] });
		const tx = makeTx({ claimed: [{ serverId: 1, connectIp: '1.2.3.4', port: 27015 }] });

		const { gameServer, created } = await ensureGameServer(tx as never, 10);

		expect(created).toBe(true);
		expect(tx.gameServer.create.mock.calls[0][0].data).toMatchObject({ matchId: 10, serverId: 2, connectIp: '1.2.3.4', port: 27025 });
		expect(gameServer).toMatchObject({ serverId: 2 });
	});

	it('still respects claims made before the registry existed (no serverId, matched by address)', async () => {
		allocatable.mockResolvedValue({ configured: 2, servers: [srv(1, 'a', 27015), srv(2, 'b', 27025)] });
		const tx = makeTx({ claimed: [{ serverId: null, connectIp: '1.2.3.4', port: 27015 }] });

		await ensureGameServer(tx as never, 10);

		expect(tx.gameServer.create.mock.calls[0][0].data.serverId).toBe(2);
	});

	it('works for env-only servers (no registry id)', async () => {
		allocatable.mockResolvedValue({ configured: 1, servers: [srv(undefined, '01', 27015)] });
		const tx = makeTx({});

		await ensureGameServer(tx as never, 10);

		expect(tx.gameServer.create.mock.calls[0][0].data.serverId).toBeNull();
	});

	it("reuses the match's existing server instead of claiming another", async () => {
		const existing = { id: 5, matchId: 10, serverId: 1 };
		const tx = makeTx({ existing });

		const result = await ensureGameServer(tx as never, 10);

		expect(result).toEqual({ gameServer: existing, created: false });
		expect(allocatable).not.toHaveBeenCalled();
	});

	it('says everything is busy when every eligible server is claimed', async () => {
		allocatable.mockResolvedValue({ configured: 2, servers: [srv(1, 'a', 27015), srv(2, 'b', 27025)] });
		const tx = makeTx({
			claimed: [
				{ serverId: 1, connectIp: '1.2.3.4', port: 27015 },
				{ serverId: 2, connectIp: '1.2.3.4', port: 27025 },
			],
		});

		await expect(ensureGameServer(tx as never, 10)).rejects.toThrow(NoAvailableGameServerError);
		await expect(ensureGameServer(tx as never, 10)).rejects.toThrow(/currently in use/);
	});

	it('says why when servers exist but none may take a match (disabled, draining, unhealthy)', async () => {
		allocatable.mockResolvedValue({ configured: 2, servers: [] });

		await expect(ensureGameServer(makeTx({}) as never, 10)).rejects.toThrow(/disabled, draining or failing health checks/);
	});

	it('fails clearly when nothing is configured at all', async () => {
		allocatable.mockResolvedValue({ configured: 0, servers: [] });

		const error = await ensureGameServer(makeTx({}) as never, 10).catch((e) => e);
		expect(error).not.toBeInstanceOf(NoAvailableGameServerError);
		expect(error.message).toMatch(/No CS2 servers configured/);
	});

	it('takes the pool lock before reading claims', async () => {
		allocatable.mockResolvedValue({ configured: 1, servers: [srv(1, 'a', 27015)] });
		const tx = makeTx({});

		await ensureGameServer(tx as never, 10);

		expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.gameServer.findMany.mock.invocationCallOrder[0]);
	});
});
