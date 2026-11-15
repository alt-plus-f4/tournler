import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { hostIdSchema } from '@/lib/admin/hosts';
import { db } from '@/lib/db';
import { agentClient, AgentError } from '@/lib/cs2/agent-client';
import { agentTargetFor, FleetError } from '@/lib/cs2/fleet';

/**
 * POST /api/admin/hosts/[hostId]/base — requires `servers:manage`, 3 per minute per user.
 * Tells the host agent to install or update the shared CS2 game files that every server on the
 * host reads. The agent refuses while any of its servers is running (updating files under a live
 * server breaks it), so stop the host's servers first. Runs in the background on the host; watch
 * its progress in the host's health reading.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ hostId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-base', limit: 3 });
		if (!guard.ok) return guard.response;

		const id = hostIdSchema.safeParse((await params).hostId);
		if (!id.success) return NextResponse.json({ error: 'Invalid host ID' }, { status: 400, headers: noStore });
		const host = await db.serverHost.findUnique({ where: { id: id.data } });
		if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404, headers: noStore });

		await agentClient.updateBase(agentTargetFor(host));
		console.info(`[admin-servers] user=${guard.userId} base-update host=${host.slug}`);
		return NextResponse.json({ started: true }, { status: 202, headers: noStore });
	} catch (error) {
		if (error instanceof FleetError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		if (error instanceof AgentError) return NextResponse.json({ error: error.message }, { status: error.status === 409 ? 409 : 502, headers: noStore });
		console.error('Error starting base update:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
