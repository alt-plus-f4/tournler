import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { serverIdSchema } from '@/lib/admin/servers';
import { db } from '@/lib/db';
import { FleetError, powerServer } from '@/lib/cs2/fleet';
import { powerSchema } from '@/lib/cs2/fleet-schemas';
import { clearLiveStatusCache } from '@/lib/cs2/server-live';

/**
 * POST /api/admin/servers/[serverId]/power — requires `servers:manage`, 10 per minute per user.
 * Body `{ action: "start" | "stop" | "restart" }`. Only for servers created through a host agent;
 * stop and restart are refused while an unfinished match holds the server.
 */
export async function POST(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-power', limit: 10 });
		if (!guard.ok) return guard.response;

		const id = serverIdSchema.safeParse((await params).serverId);
		if (!id.success) return NextResponse.json({ error: 'Invalid server ID' }, { status: 400, headers: noStore });
		const body = powerSchema.safeParse(await request.json().catch(() => null));
		if (!body.success) return NextResponse.json({ error: 'Action must be start, stop or restart' }, { status: 400, headers: noStore });

		const row = await db.cs2Server.findUnique({ where: { slug: id.data }, include: { host: true } });
		if (!row) return NextResponse.json({ error: 'Server not found' }, { status: 404, headers: noStore });

		const state = await powerServer(row, body.data.action);
		clearLiveStatusCache();
		console.info(`[admin-servers] user=${guard.userId} power=${body.data.action} server=${row.slug}`);
		return NextResponse.json({ success: true, state }, { headers: noStore });
	} catch (error) {
		if (error instanceof FleetError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		console.error('Error changing game server power state:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
