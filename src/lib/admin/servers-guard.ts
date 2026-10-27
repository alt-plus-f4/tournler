import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { checkRateLimit } from '@/lib/rate-limit';
import { loadPool, serverIdSchema } from '@/lib/admin/servers';
import type { Cs2ServerConfig } from '@/lib/cs2/server-pool';

export const noStore = { 'Cache-Control': 'no-store' } as const;

export type GuardResult = { ok: true; userId: string } | { ok: false; response: NextResponse };

/** 401 without a session, 403 without `servers:manage`, 429 when the per-user bucket is exhausted. */
export async function guardServersRequest(rateLimit?: { key: string; limit: number }): Promise<GuardResult> {
	const session = await getAuthSession();
	if (!session) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore }) };
	if (!(await userHasPermission(session.user.id, 'servers:manage'))) return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: noStore }) };
	if (rateLimit && !checkRateLimit(`${rateLimit.key}:${session.user.id}`, rateLimit.limit, 60_000)) {
		return { ok: false, response: NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: noStore }) };
	}
	return { ok: true, userId: session.user.id };
}

export type ServerLookup = { ok: true; server: Cs2ServerConfig } | { ok: false; response: NextResponse };

/** Resolves a URL id to a pool entry. The id is only ever matched against the configured pool, never used as a host. */
export function lookupPoolServer(rawId: string): ServerLookup {
	const parsed = serverIdSchema.safeParse(rawId);
	if (!parsed.success) return { ok: false, response: NextResponse.json({ error: 'Invalid server ID' }, { status: 400, headers: noStore }) };
	const pool = loadPool();
	if (!pool.ok) return { ok: false, response: NextResponse.json({ error: 'Server pool is misconfigured' }, { status: 500, headers: noStore }) };
	const server = pool.pool.find((s) => s.id === parsed.data);
	if (!server) return { ok: false, response: NextResponse.json({ error: 'Server not found' }, { status: 404, headers: noStore }) };
	return { ok: true, server };
}
