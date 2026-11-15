import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { hostIdSchema } from '@/lib/admin/hosts';
import { advanceHostUpdate, cancelHostUpdate, getHostUpdateState, HostUpdateError, requestHostUpdate } from '@/lib/admin/host-updates';

const bodySchema = z.object({ action: z.enum(['request', 'cancel', 'advance']) });

/**
 * POST /api/admin/hosts/[hostId]/update — requires `servers:manage`, 30 per minute per user.
 * `request` drains the host's servers and updates CS2 once no match is running on it; `cancel`
 * abandons it and returns the servers to service; `advance` re-checks progress (the admin screen
 * calls it while it polls, so the update moves on even without a cron). Responds with the current state.
 */
export async function POST(request: Request, { params }: { params: Promise<{ hostId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-update-cs2', limit: 30 });
		if (!guard.ok) return guard.response;

		const id = hostIdSchema.safeParse((await params).hostId);
		if (!id.success) return NextResponse.json({ error: 'Invalid host ID' }, { status: 400, headers: noStore });
		const body = bodySchema.safeParse(await request.json().catch(() => null));
		if (!body.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: noStore });

		let step;
		if (body.data.action === 'request') step = await requestHostUpdate(id.data);
		else if (body.data.action === 'advance') step = await advanceHostUpdate(id.data);
		else {
			await cancelHostUpdate(id.data);
			step = { state: 'idle' as const };
		}
		console.info(`[admin-servers] user=${guard.userId} host-update=${body.data.action} host=${id.data}`);
		return NextResponse.json({ step, update: await getHostUpdateState(id.data) }, { headers: noStore });
	} catch (error) {
		if (error instanceof HostUpdateError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		console.error('Error updating host CS2:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
