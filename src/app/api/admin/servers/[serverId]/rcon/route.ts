import { NextResponse } from 'next/server';
import { guardServersRequest, lookupPoolServer, noStore } from '@/lib/admin/servers-guard';
import { isBlockedRconCommand, rconBodySchema } from '@/lib/admin/servers';
import { describeRconError } from '@/lib/cs2/parse-status';
import { redactSecrets, STATUS_TIMEOUT_MS, withTimeout } from '@/lib/cs2/server-live';
import { withRcon } from '@/lib/cs2/rcon-client';

/**
 * POST /api/admin/servers/[serverId]/rcon — requires `servers:manage`. Body: { command }.
 * Runs one console command on a pool server and returns its output. The server is resolved from
 * the pool by id only; output is scrubbed of RCON passwords and errors are generic.
 */
export async function POST(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-rcon', limit: 30 });
		if (!guard.ok) return guard.response;

		const lookup = lookupPoolServer((await params).serverId);
		if (!lookup.ok) return lookup.response;
		const { server } = lookup;

		const body = await request.json().catch(() => null);
		const parsed = rconBodySchema.safeParse(body);
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid command' }, { status: 400, headers: noStore });
		const { command } = parsed.data;
		if (isBlockedRconCommand(command)) return NextResponse.json({ error: 'This command is not allowed' }, { status: 400, headers: noStore });

		console.info(`[admin-rcon] user=${guard.userId} server=${server.id} command=${command.split(/\s+/)[0]}`);

		try {
			const output = await withTimeout(
				withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute(command)),
				STATUS_TIMEOUT_MS * 2,
			);
			return NextResponse.json({ success: true, output: redactSecrets(String(output ?? '')) }, { headers: noStore });
		} catch (error) {
			return NextResponse.json({ error: `Command failed: ${describeRconError(error)}` }, { status: 502, headers: noStore });
		}
	} catch (error) {
		console.error('Error running RCON command:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
