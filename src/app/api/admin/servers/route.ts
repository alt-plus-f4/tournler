import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { suggestNext } from '@/lib/cs2/pool-builder';
import { findAssignedMatches, loadPool, summarize, toPublicServer } from '@/lib/admin/servers';
import { getLiveStatus } from '@/lib/cs2/server-live';
import { getEnvServerPool } from '@/lib/cs2/server-pool';
import { db } from '@/lib/db';
import { toPublicHost } from '@/lib/admin/hosts';
import { checkTestHost } from '@/lib/cs2/test-target';
import { effectiveRcon, findPoolConflict, poolEntrySchema } from '@/lib/cs2/pool-builder';
import { isSecretKeyConfigured, sealSecret } from '@/lib/cs2/secret-box';

/**
 * GET /api/admin/servers — requires `servers:manage`.
 * One entry per server in the configured pool (CS2_SERVER_POOL), with live status read over RCON
 * (short per-server timeout, run in parallel, cached for a few seconds) and a summary of the match
 * currently assigned to it. RCON host and password never leave the server.
 */
export async function GET(request: Request) {
	try {
		// ?fresh=1 (the manual "Refresh all") bypasses the 5s cache, so it is rate limited.
		const fresh = new URL(request.url).searchParams.get('fresh') === '1';
		const guard = await guardServersRequest(fresh ? { key: 'admin-servers-fresh', limit: 12 } : undefined);
		if (!guard.ok) return guard.response;

		const pool = await loadPool();
		if (!pool.ok) {
			return NextResponse.json(
				{ servers: [], hosts: [], summary: summarize([]), poolError: true, secretKeyMissing: !isSecretKeyConfigured(), envImportAvailable: false, suggestions: suggestNext([]) },
				{ headers: noStore },
			);
		}

		const hosts = await db.serverHost.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { servers: true } } } });
		const hasRegistry = pool.pool.some((s) => s.dbId != null);
		let envImportAvailable = false;
		if (!hasRegistry) {
			try {
				envImportAvailable = getEnvServerPool().length > 0 && isSecretKeyConfigured();
			} catch {
				envImportAvailable = false;
			}
		}

		const [live, assigned] = await Promise.all([Promise.all(pool.pool.map((s) => getLiveStatus(s, { fresh }))), findAssignedMatches(pool.pool)]);

		const servers = pool.pool.map((server, i) => {
			const match = assigned.get(server.id) ?? null;
			return { ...toPublicServer(server), lastHealthy: server.lastHealthy ?? null, status: live[i].live, match };
		});

		return NextResponse.json(
			{
				servers,
				hosts: hosts.map(toPublicHost),
				summary: summarize(servers.map((s) => ({ online: s.status.online, inUse: s.match !== null }))),
				poolError: false,
				secretKeyMissing: !isSecretKeyConfigured(),
				envImportAvailable,
				suggestions: suggestNext(pool.pool),
			},
			{ headers: noStore },
		);
	} catch (error) {
		console.error('Error listing game servers:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}

/**
 * POST /api/admin/servers — requires `servers:manage`, 10 per minute per user.
 * Registers a server that already exists (set up by hand): validates it, checks that RCON answers
 * with the given password, then stores it with the password encrypted. Servers created through a
 * host agent go through POST /api/admin/hosts/[hostId]/servers instead.
 */
export async function POST(request: Request) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-register', limit: 10 });
		if (!guard.ok) return guard.response;
		if (!isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server, so passwords cannot be stored' }, { status: 409, headers: noStore });

		const parsed = poolEntrySchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });
		const entry = parsed.data;
		const target = effectiveRcon(entry);
		if (target.port > 65535) return NextResponse.json({ error: 'Port must be 1-65535' }, { status: 400, headers: noStore });

		const current = await loadPool();
		if (!current.ok) return NextResponse.json({ error: 'The current server registry could not be read. Fix it before adding servers.' }, { status: 409, headers: noStore });
		const conflict = findPoolConflict(current.pool, { ...entry, id: entry.id.toLowerCase() });
		if (conflict) return NextResponse.json({ error: conflict }, { status: 409, headers: noStore });

		const host = entry.hostId ? await db.serverHost.findUnique({ where: { id: entry.hostId } }) : null;
		if (entry.hostId && !host) return NextResponse.json({ error: 'Host not found' }, { status: 404, headers: noStore });

		const check = await checkTestHost(target.host, current.pool);
		if (!check.ok) return NextResponse.json({ error: 'This host is not allowed. Use a public address.' }, { status: 400, headers: noStore });

		const row = await db.cs2Server.create({
			data: {
				slug: entry.id.toLowerCase(),
				name: entry.name ?? `Server ${entry.id}`,
				ip: entry.ip,
				port: entry.port,
				rconHost: target.host,
				rconPort: target.port,
				rconPasswordEnc: sealSecret(entry.rconPassword),
				region: entry.region ?? host?.region ?? 'eu',
				hostId: host?.id ?? null,
				managed: false,
			},
		});
		console.info(`[admin-servers] user=${guard.userId} registered server=${row.slug}`);
		return NextResponse.json({ id: row.slug }, { status: 201, headers: noStore });
	} catch (error) {
		if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002')
			return NextResponse.json({ error: 'A server with this id or address already exists' }, { status: 409, headers: noStore });
		console.error('Error registering game server:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
