import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { hostIdSchema } from '@/lib/admin/hosts';
import { createManagedServer, FleetError } from '@/lib/cs2/fleet';
import { createManagedServerSchema } from '@/lib/cs2/fleet-schemas';
import { isSecretKeyConfigured } from '@/lib/cs2/secret-box';

/**
 * POST /api/admin/hosts/[hostId]/servers — requires `servers:manage`, 6 per minute per user.
 * Creates one more CS2 server on a host through its agent: picks the next free port slot, generates
 * the RCON/connect/GOTV passwords, has the agent create and start the container, and registers it.
 * The server shows as offline until CS2 finishes booting (a minute or two).
 */
export async function POST(request: Request, { params }: { params: Promise<{ hostId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-create-server', limit: 6 });
		if (!guard.ok) return guard.response;
		if (!isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server' }, { status: 409, headers: noStore });

		const id = hostIdSchema.safeParse((await params).hostId);
		if (!id.success) return NextResponse.json({ error: 'Invalid host ID' }, { status: 400, headers: noStore });
		const parsed = createManagedServerSchema.safeParse((await request.json().catch(() => ({}))) ?? {});
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });

		const server = await createManagedServer(id.data, parsed.data);
		console.info(`[admin-servers] user=${guard.userId} created server=${server.slug} on host=${id.data}`);
		return NextResponse.json({ id: server.slug, address: `${server.ip}:${server.port}` }, { status: 201, headers: noStore });
	} catch (error) {
		if (error instanceof FleetError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		console.error('Error creating managed game server:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
