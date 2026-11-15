import { NextResponse } from 'next/server';
import { guardServersRequest, lookupPoolServer, noStore } from '@/lib/admin/servers-guard';
import { findServerMatches, toPublicServer } from '@/lib/admin/servers';
import { getLiveStatus, readSettingValues } from '@/lib/cs2/server-live';
import { db } from '@/lib/db';
import { FleetError, removeServer } from '@/lib/cs2/fleet';
import { serverPatchSchema } from '@/lib/cs2/fleet-schemas';
import { isSecretKeyConfigured, sealSecret } from '@/lib/cs2/secret-box';
import { serverIdSchema } from '@/lib/admin/servers';

/**
 * GET /api/admin/servers/[serverId] — requires `servers:manage`.
 * Detail for one pool server: live status with the raw `status` output, current values of the
 * allowlisted cvars, and the match it is serving (including the staff-only connect password).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-detail', limit: 60 });
		if (!guard.ok) return guard.response;

		const lookup = await lookupPoolServer((await params).serverId);
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

/** Registry row for a URL id, or a ready 4xx response. Env-only (not yet imported) servers have no row to change. */
async function findRow(rawId: string) {
	const id = serverIdSchema.safeParse(rawId);
	if (!id.success) return { response: NextResponse.json({ error: 'Invalid server ID' }, { status: 400, headers: noStore }) } as const;
	const row = await db.cs2Server.findUnique({ where: { slug: id.data }, include: { host: true } });
	if (!row) return { response: NextResponse.json({ error: 'Server not found in the registry. Import it first.' }, { status: 404, headers: noStore }) } as const;
	return { row } as const;
}

/**
 * PATCH /api/admin/servers/[serverId] — requires `servers:manage`, 30 per minute per user.
 * Renames a server, changes its region, switches it ACTIVE / DRAINING / DISABLED, or replaces its
 * stored RCON password (for a server whose password was changed on the box).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-update', limit: 30 });
		if (!guard.ok) return guard.response;

		const found = await findRow((await params).serverId);
		if (found.response) return found.response;

		const parsed = serverPatchSchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });
		const { rconPassword, ...rest } = parsed.data;
		if (rconPassword && !isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server' }, { status: 409, headers: noStore });

		await db.cs2Server.update({ where: { id: found.row.id }, data: { ...rest, ...(rconPassword ? { rconPasswordEnc: sealSecret(rconPassword) } : {}) } });
		console.info(`[admin-servers] user=${guard.userId} updated server=${found.row.slug} fields=${Object.keys(parsed.data).join(',')}`);
		return NextResponse.json({ success: true }, { headers: noStore });
	} catch (error) {
		console.error('Error updating game server:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}

/**
 * DELETE /api/admin/servers/[serverId] — requires `servers:manage`, 10 per minute per user.
 * Refused (409) while an unfinished match holds the server. For servers created through a host
 * agent the container and its data are removed on the host too.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-delete', limit: 10 });
		if (!guard.ok) return guard.response;

		const found = await findRow((await params).serverId);
		if (found.response) return found.response;

		await removeServer(found.row);
		console.info(`[admin-servers] user=${guard.userId} removed server=${found.row.slug}`);
		return NextResponse.json({ success: true }, { headers: noStore });
	} catch (error) {
		if (error instanceof FleetError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		console.error('Error removing game server:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
