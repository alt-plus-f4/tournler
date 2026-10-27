import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { suggestNext } from '@/lib/cs2/pool-builder';
import { findAssignedMatches, loadPool, summarize, toPublicServer } from '@/lib/admin/servers';
import { getLiveStatus } from '@/lib/cs2/server-live';

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

		const pool = loadPool();
		if (!pool.ok) {
			return NextResponse.json({ servers: [], summary: summarize([]), poolError: true, suggestions: suggestNext([]) }, { headers: noStore });
		}

		const [live, assigned] = await Promise.all([Promise.all(pool.pool.map((s) => getLiveStatus(s, { fresh }))), findAssignedMatches(pool.pool)]);

		const servers = pool.pool.map((server, i) => {
			const match = assigned.get(server.id) ?? null;
			return { ...toPublicServer(server), status: live[i].live, match };
		});

		return NextResponse.json(
			{ servers, summary: summarize(servers.map((s) => ({ online: s.status.online, inUse: s.match !== null }))), poolError: false, suggestions: suggestNext(pool.pool) },
			{ headers: noStore },
		);
	} catch (error) {
		console.error('Error listing game servers:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
