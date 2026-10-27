import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { loadPool } from '@/lib/admin/servers';
import { buildPoolOutput, effectiveRcon, findPoolConflict, poolEntrySchema } from '@/lib/cs2/pool-builder';

/**
 * POST /api/admin/servers/preview — requires `servers:manage`, 20 per minute per user.
 * Builds the copy-paste output for adding a server (new JSON entry, merged CS2_SERVER_POOL, docker
 * snippets). Nothing is stored and no connection is made. Existing entries' rconPassword values
 * are replaced by a placeholder, so existing secrets never leave the server.
 */
export async function POST(request: Request) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-preview', limit: 20 });
		if (!guard.ok) return guard.response;

		const parsed = poolEntrySchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });
		const entry = parsed.data;
		if (effectiveRcon(entry).port > 65535) return NextResponse.json({ error: 'Port must be 1-65535' }, { status: 400, headers: noStore });

		const pool = loadPool();
		if (!pool.ok) return NextResponse.json({ error: 'The current CS2_SERVER_POOL is not valid JSON. Fix it before adding servers.' }, { status: 409, headers: noStore });
		const conflict = findPoolConflict(pool.pool, entry);
		if (conflict) return NextResponse.json({ error: conflict }, { status: 409, headers: noStore });

		return NextResponse.json(buildPoolOutput(pool.pool, entry), { headers: noStore });
	} catch (error) {
		console.error('Error building pool preview:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
