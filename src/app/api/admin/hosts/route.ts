import { NextResponse } from 'next/server';
import { guardServersRequest, noStore } from '@/lib/admin/servers-guard';
import { toPublicHost } from '@/lib/admin/hosts';
import { db } from '@/lib/db';
import { agentClient, type AgentHealth } from '@/lib/cs2/agent-client';
import { agentTargetFor } from '@/lib/cs2/fleet';
import { hostInputSchema } from '@/lib/cs2/fleet-schemas';
import { isSecretKeyConfigured, sealSecret } from '@/lib/cs2/secret-box';
import { checkAgentUrl } from '@/lib/cs2/test-target';

/**
 * GET /api/admin/hosts — requires `servers:manage`.
 * Every host with its server count and, for hosts with an agent, a live health reading (disk, shared
 * install, base update state). An unreachable agent is reported per host, never as a failure.
 */
export async function GET() {
	try {
		const guard = await guardServersRequest();
		if (!guard.ok) return guard.response;

		const hosts = await db.serverHost.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { servers: true } } } });
		const health = await Promise.all(
			hosts.map(async (host): Promise<{ health: AgentHealth | null; error: string | null }> => {
				if (!host.agentUrl || !host.agentSecretEnc) return { health: null, error: null };
				try {
					return { health: await agentClient.health(agentTargetFor(host)), error: null };
				} catch (error) {
					return { health: null, error: error instanceof Error ? error.message : 'Host agent is unreachable' };
				}
			}),
		);
		return NextResponse.json({ hosts: hosts.map((h, i) => ({ ...toPublicHost(h), ...health[i] })) }, { headers: noStore });
	} catch (error) {
		console.error('Error listing server hosts:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}

/**
 * POST /api/admin/hosts — requires `servers:manage`, 10 per minute per user.
 * Registers a machine that runs CS2 containers. With an agent URL and secret the app can create
 * servers on it; the agent URL is vetted (https + public address in production) and the secret is
 * stored encrypted.
 */
export async function POST(request: Request) {
	try {
		const guard = await guardServersRequest({ key: 'admin-hosts-create', limit: 10 });
		if (!guard.ok) return guard.response;

		const parsed = hostInputSchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400, headers: noStore });
		const { agentSecret, agentUrl, ...rest } = parsed.data;

		if (Boolean(agentUrl) !== Boolean(agentSecret)) return NextResponse.json({ error: 'Set both the agent URL and the agent secret, or neither' }, { status: 400, headers: noStore });
		if (agentUrl && agentSecret) {
			if (!isSecretKeyConfigured()) return NextResponse.json({ error: 'SERVER_SECRET_KEY is not set on the server' }, { status: 409, headers: noStore });
			const known = (await db.serverHost.findMany({ select: { publicHost: true } })).map((h) => h.publicHost);
			const check = await checkAgentUrl(agentUrl, known);
			if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400, headers: noStore });
		}

		const host = await db.serverHost.create({
			data: { ...rest, agentUrl: agentUrl ?? null, agentSecretEnc: agentSecret ? sealSecret(agentSecret) : null },
			include: { _count: { select: { servers: true } } },
		});
		console.info(`[admin-servers] user=${guard.userId} created host=${host.slug}`);
		return NextResponse.json({ host: toPublicHost(host) }, { status: 201, headers: noStore });
	} catch (error) {
		if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'A host with this id already exists' }, { status: 409, headers: noStore });
		console.error('Error creating server host:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
