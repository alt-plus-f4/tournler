import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { hostIdSchema, toPublicHost } from '@/lib/admin/hosts';
import { db } from '@/lib/db';
import { hostPatchSchema } from '@/lib/cs2/fleet-schemas';
import { isSecretKeyConfigured, sealSecret } from '@/lib/cs2/secret-box';
import { checkAgentUrl } from '@/lib/cs2/test-target';

/** PATCH /api/admin/hosts/[hostId] — requires `servers:manage`, 20 per minute per user. Edits a host's label, address, limits or agent credentials. */
export async function PATCH(request: Request, { params }: { params: Promise<{ hostId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-update', limit: 20 });
		if (!guard.ok) return guard.response;

		const id = hostIdSchema.safeParse((await params).hostId);
		if (!id.success) return NextResponse.json({ error: 'Invalid host ID' }, { status: 400, headers: noStore });
		const parsed = hostPatchSchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });

		const existing = await db.serverHost.findUnique({ where: { id: id.data } });
		if (!existing) return NextResponse.json({ error: 'Host not found' }, { status: 404, headers: noStore });

		const { agentSecret, agentUrl, ...rest } = parsed.data;
		if ((agentSecret || agentUrl) && !isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server' }, { status: 409, headers: noStore });
		if (agentUrl) {
			const known = (await db.serverHost.findMany({ select: { publicHost: true } })).map((h) => h.publicHost);
			const check = await checkAgentUrl(agentUrl, known);
			if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400, headers: noStore });
		}

		const host = await db.serverHost.update({
			where: { id: existing.id },
			data: {
				...rest,
				...(agentUrl !== undefined ? { agentUrl } : {}),
				...(agentSecret ? { agentSecretEnc: sealSecret(agentSecret) } : {}),
				// Clearing the URL also drops the secret so a half-configured agent can't linger.
				...(agentUrl === null ? { agentSecretEnc: null } : {}),
			},
			include: { _count: { select: { servers: true } } },
		});
		console.info(`[admin-servers] user=${guard.userId} updated host=${host.slug}`);
		return NextResponse.json({ host: toPublicHost(host) }, { headers: noStore });
	} catch (error) {
		console.error('Error updating server host:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}

/** DELETE /api/admin/hosts/[hostId] — requires `servers:manage`, 10 per minute per user. Refused while servers are registered on the host. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ hostId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-delete', limit: 10 });
		if (!guard.ok) return guard.response;

		const id = hostIdSchema.safeParse((await params).hostId);
		if (!id.success) return NextResponse.json({ error: 'Invalid host ID' }, { status: 400, headers: noStore });
		const host = await db.serverHost.findUnique({ where: { id: id.data }, include: { _count: { select: { servers: true } } } });
		if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404, headers: noStore });
		if (host._count.servers > 0) return NextResponse.json({ error: "Remove this host's servers first" }, { status: 409, headers: noStore });

		await db.serverHost.delete({ where: { id: host.id } });
		console.info(`[admin-servers] user=${guard.userId} deleted host=${host.slug}`);
		return NextResponse.json({ success: true }, { headers: noStore });
	} catch (error) {
		console.error('Error deleting server host:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
