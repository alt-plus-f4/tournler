import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { loadPool } from '@/lib/admin/servers';
import { effectiveRcon, poolEntrySchema } from '@/lib/cs2/pool-builder';
import { probeTarget } from '@/lib/cs2/server-live';
import { checkTestHost } from '@/lib/cs2/test-target';

/**
 * POST /api/admin/servers/test — requires `servers:manage`, 10 per minute per user.
 * Runs one RCON `status` against the entered values without saving anything. This takes a host
 * from the client, so it is an SSRF surface: every field is validated and the host must pass
 * `checkTestHost` (public addresses only in production, unless the pool already uses that host).
 * The password is never logged or echoed.
 */
export async function POST(request: Request) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-test', limit: 10 });
		if (!guard.ok) return guard.response;

		const parsed = poolEntrySchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });
		const entry = parsed.data;
		const target = effectiveRcon(entry);
		if (target.port > 65535) return NextResponse.json({ error: 'Port must be 1-65535' }, { status: 400, headers: noStore });

		const pool = loadPool();
		const check = await checkTestHost(target.host, pool.ok ? pool.pool : []);
		if (!check.ok) return NextResponse.json({ error: 'This host is not allowed. Use a public address.' }, { status: 400, headers: noStore });

		console.info(`[admin-servers] user=${guard.userId} test-connection id=${entry.id}`);
		const { live } = await probeTarget({ host: check.address, port: target.port, password: entry.rconPassword });
		return NextResponse.json(
			{ online: live.online, reason: live.reason, map: live.map, hostname: live.hostname, humans: live.humans, bots: live.bots, maxPlayers: live.maxPlayers, latencyMs: live.latencyMs },
			{ headers: noStore },
		);
	} catch (error) {
		console.error('Error testing game server connection:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
