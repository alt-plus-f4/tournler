import { NextResponse } from 'next/server';
import { guardServersRequest, lookupPoolServer, noStore } from '@/lib/admin/servers-guard';
import { findServerMatches, toPublicServer } from '@/lib/admin/servers';
import { getLiveStatus, readSettingValues } from '@/lib/cs2/server-live';

/**
 * GET /api/admin/servers/[serverId] — requires `servers:manage`.
 * Detail for one pool server: live status with the raw `status` output, current values of the
 * allowlisted cvars, and the match it is serving (including the staff-only connect password).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-detail', limit: 60 });
		if (!guard.ok) return guard.response;

		const lookup = lookupPoolServer((await params).serverId);
		if (!lookup.ok) return lookup.response;
		const { server } = lookup;

		const [{ live, raw }, matches] = await Promise.all([getLiveStatus(server, { fresh: true }), findServerMatches(server)]);
		const settings = live.online ? await readSettingValues(server) : null;

		return NextResponse.json({ server: toPublicServer(server), status: live, raw, settings, current: matches.current, recent: matches.recent }, { headers: noStore });
	} catch (error) {
		console.error('Error loading game server:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
