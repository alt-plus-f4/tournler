import { z } from 'zod';
import { db } from '@/lib/db';
import { getServerPool, type Cs2ServerConfig } from '@/lib/cs2/server-pool';

/** Pool ids are free-form strings from CS2_SERVER_POOL; this only bounds what a URL segment may look like before the pool lookup. */
export const serverIdSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9._-]+$/);

export const RCON_MAX_COMMAND_LENGTH = 512;

export const rconBodySchema = z.object({
	command: z
		.string()
		.trim()
		.min(1, 'A command is required')
		.max(RCON_MAX_COMMAND_LENGTH, `Command too long (max ${RCON_MAX_COMMAND_LENGTH} characters)`)
		// eslint-disable-next-line no-control-regex
		.refine((c) => !/[\u0000-\u001f\u007f]/.test(c), 'Command contains control characters'),
});

/** Commands that would reveal or change the RCON credential itself are never run from the console. */
export function isBlockedRconCommand(command: string): boolean {
	return /^\s*rcon_password\b/i.test(command);
}

export type PoolLookup = { ok: true; pool: Cs2ServerConfig[] } | { ok: false };

/** Reads the pool; a malformed CS2_SERVER_POOL is reported as a flag instead of throwing. */
export function loadPool(): PoolLookup {
	try {
		const pool = getServerPool();
		if (!Array.isArray(pool)) return { ok: false };
		return { ok: true, pool };
	} catch {
		return { ok: false };
	}
}

/** The only fields about a pool entry that may reach the client: never rconHost or rconPassword. */
export function toPublicServer(server: Cs2ServerConfig) {
	return { id: server.id, ip: server.ip, port: server.port, address: `${server.ip}:${server.port}` };
}

export type AssignedMatch = {
	gameServerId: number;
	gameServerStatus: string;
	matchId: number;
	matchStatus: string;
	teamA: string;
	teamB: string;
	tournament: string;
	scheduledAt: string;
	matchConfigLoadedAt: string | null;
};

type MatchRow = {
	id: number;
	status: string;
	matchDate: Date;
	teamAName: string | null;
	teamBName: string | null;
	teamA: { name: string } | null;
	teamB: { name: string } | null;
	tournament: { name: string };
};

const matchSelect = {
	id: true,
	status: true,
	matchDate: true,
	teamAName: true,
	teamBName: true,
	teamA: { select: { name: true } },
	teamB: { select: { name: true } },
	tournament: { select: { name: true } },
} as const;

const teamLabel = (team: { name: string } | null, fallback: string | null) => team?.name ?? fallback ?? 'TBD';

export const connectKey = (ip: string, port: number) => `${ip}:${port}`;

/** A server is "in use" while a GameServer row for it is PENDING/RUNNING and its match is not finished. */
const activeWhere = { status: { in: ['PENDING', 'RUNNING'] as ('PENDING' | 'RUNNING')[] }, match: { status: { not: 'COMPLETED' as const } } };

function toAssigned(row: { id: number; status: string; matchConfigLoadedAt: Date | null; match: MatchRow }): AssignedMatch {
	return {
		gameServerId: row.id,
		gameServerStatus: row.status,
		matchId: row.match.id,
		matchStatus: row.match.status,
		teamA: teamLabel(row.match.teamA, row.match.teamAName),
		teamB: teamLabel(row.match.teamB, row.match.teamBName),
		tournament: row.match.tournament.name,
		scheduledAt: row.match.matchDate.toISOString(),
		matchConfigLoadedAt: row.matchConfigLoadedAt?.toISOString() ?? null,
	};
}

/** One query for every pool entry's active match, keyed by pool id. */
export async function findAssignedMatches(pool: Cs2ServerConfig[]): Promise<Map<string, AssignedMatch>> {
	const result = new Map<string, AssignedMatch>();
	if (pool.length === 0) return result;
	const rows = await db.gameServer.findMany({
		where: { ...activeWhere, OR: pool.map((s) => ({ connectIp: s.ip, port: s.port })) },
		orderBy: { createdAt: 'desc' },
		select: { id: true, status: true, matchConfigLoadedAt: true, connectIp: true, port: true, match: { select: matchSelect } },
	});
	const byKey = new Map<string, AssignedMatch>();
	for (const row of rows) {
		const key = connectKey(row.connectIp, row.port);
		if (!byKey.has(key)) byKey.set(key, toAssigned(row));
	}
	for (const s of pool) {
		const hit = byKey.get(connectKey(s.ip, s.port));
		if (hit) result.set(s.id, hit);
	}
	return result;
}

/** Active match for one server plus its staff-only connect password, and the last few finished matches. */
export async function findServerMatches(server: Cs2ServerConfig) {
	const [active, finished] = await Promise.all([
		db.gameServer.findFirst({
			where: { ...activeWhere, connectIp: server.ip, port: server.port },
			orderBy: { createdAt: 'desc' },
			select: { id: true, status: true, matchConfigLoadedAt: true, password: true, match: { select: matchSelect } },
		}),
		db.gameServer.findMany({
			where: { connectIp: server.ip, port: server.port, match: { status: 'COMPLETED' } },
			orderBy: { createdAt: 'desc' },
			take: 5,
			select: { id: true, match: { select: { ...matchSelect, completedAt: true, scoreTeamA: true, scoreTeamB: true } } },
		}),
	]);

	return {
		current: active ? { ...toAssigned(active), password: active.password } : null,
		recent: finished.map((g) => ({
			matchId: g.match.id,
			teamA: teamLabel(g.match.teamA, g.match.teamAName),
			teamB: teamLabel(g.match.teamB, g.match.teamBName),
			tournament: g.match.tournament.name,
			scoreTeamA: g.match.scoreTeamA,
			scoreTeamB: g.match.scoreTeamB,
			completedAt: (g.match.completedAt ?? g.match.matchDate).toISOString(),
		})),
	};
}

export type ServersSummary = { total: number; online: number; offline: number; inUse: number; free: number };

export function summarize(servers: { online: boolean; inUse: boolean }[]): ServersSummary {
	const online = servers.filter((s) => s.online).length;
	const inUse = servers.filter((s) => s.inUse).length;
	return { total: servers.length, online, offline: servers.length - online, inUse, free: servers.length - inUse };
}
