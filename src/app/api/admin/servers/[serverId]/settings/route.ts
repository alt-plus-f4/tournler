import { NextResponse } from 'next/server';
import { guardServersRequest, lookupPoolServer, noStore } from '@/lib/admin/servers-guard';
import { describeRconError } from '@/lib/cs2/parse-status';
import { STATUS_TIMEOUT_MS, withTimeout } from '@/lib/cs2/server-live';
import { withRcon } from '@/lib/cs2/rcon-client';
import { buildSetCommand, getSettingDefinition, settingsPatchSchema, validateSettingValue } from '@/lib/cs2/server-settings';

/**
 * PATCH /api/admin/servers/[serverId]/settings — requires `servers:manage`.
 * Body: { settings: { <cvar>: value } }. Only cvars on the allowlist in `server-settings.ts` are
 * accepted; each value is type/range checked and rejected if it holds `;`, quotes, newlines or
 * control characters, so a value can never inject another console command.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
	try {
		const guard = await guardServersRequest({ key: 'admin-servers-settings', limit: 20 });
		if (!guard.ok) return guard.response;

		const lookup = lookupPoolServer((await params).serverId);
		if (!lookup.ok) return lookup.response;
		const { server } = lookup;

		const body = await request.json().catch(() => null);
		const parsed = settingsPatchSchema.safeParse(body);
		if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings' }, { status: 400, headers: noStore });

		const commands: string[] = [];
		for (const [name, raw] of Object.entries(parsed.data.settings)) {
			const def = getSettingDefinition(name);
			if (!def) continue;
			const value = validateSettingValue(def, raw);
			if (value.ok) commands.push(buildSetCommand(def, value.value));
		}

		// Names only: values (some are passwords) are never logged.
		console.info(`[admin-servers] user=${guard.userId} server=${server.id} set=${Object.keys(parsed.data.settings).join(',')}`);

		try {
			await withTimeout(
				withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
					for (const command of commands) await rcon.execute(command);
				}),
				STATUS_TIMEOUT_MS * 3,
			);
		} catch (error) {
			return NextResponse.json({ error: `Could not apply settings: ${describeRconError(error)}` }, { status: 502, headers: noStore });
		}

		return NextResponse.json({ success: true, applied: Object.keys(parsed.data.settings) }, { headers: noStore });
	} catch (error) {
		console.error('Error updating game server settings:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
	}
}
