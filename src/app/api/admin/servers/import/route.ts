import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { FleetError, importEnvServers } from '@/lib/cs2/fleet';
import { isSecretKeyConfigured } from '@/lib/cs2/secret-box';

/**
 * POST /api/admin/servers/import — requires `servers:manage`, 5 per minute per user.
 * One-time migration: copies the servers in CS2_SERVER_POOL (or the single-server env vars) into
 * the registry, encrypting each RCON password. Already-registered servers are skipped. The env
 * vars can be deleted afterwards.
 */
export async function POST() {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-import', limit: 5 });
		if (!guard.ok) return guard.response;
		if (!isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server, so passwords cannot be stored' }, { status: 409, headers: noStore });

		const result = await importEnvServers();
		console.info(`[admin-servers] user=${guard.userId} imported=${result.imported} skipped=${result.skipped}`);
		return NextResponse.json(result, { headers: noStore });
	} catch (error) {
		if (error instanceof FleetError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
		console.error('Error importing env servers:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
