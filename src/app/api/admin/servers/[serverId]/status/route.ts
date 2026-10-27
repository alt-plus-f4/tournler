import { NextResponse } from 'next/server';
import { guardServersRequest, lookupPoolServer, noStore } from '@/lib/admin/servers-guard';
import { getLiveStatus } from '@/lib/cs2/server-live';

/**
 * GET /api/admin/servers/[serverId]/status — requires `servers:manage`, 30 per minute per user.
 * Re-runs the RCON `status` check for this one server, bypassing the short server-side cache.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-status', limit: 30 });
		if (!guard.ok) return guard.response;

		const lookup = lookupPoolServer((await params).serverId);
		if (!lookup.ok) return lookup.response;

		const { live } = await getLiveStatus(lookup.server, { fresh: true });
		return NextResponse.json({ status: live }, { headers: noStore });
	} catch (error) {
		console.error('Error checking game server status:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
