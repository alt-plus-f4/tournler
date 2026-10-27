import { z } from 'zod';

/**
 * Strict allowlist of CS2 cvars staff may read and change from the admin servers page. Nothing
 * outside this list can be set, every value is type- and range-checked, and anything that could
 * smuggle a second console command (`;`, quotes, newlines, control characters, backslash) is
 * rejected, so a value can never become anything but the argument of its own cvar.
 */
export type SettingType = 'int' | 'float' | 'bool' | 'enum' | 'string' | 'password';

export interface SettingDefinition {
	name: string;
	label: string;
	description: string;
	type: SettingType;
	min?: number;
	max?: number;
	/** Max length for string/password types. */
	maxLength?: number;
	options?: readonly string[];
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
	{ name: 'hostname', label: 'Hostname', description: 'Name shown in the server browser.', type: 'string', maxLength: 64 },
	{ name: 'sv_password', label: 'Connect password', description: 'Write-only. The app sets this per match, so a manual change is overwritten on the next sync.', type: 'password', maxLength: 32 },
	{ name: 'tv_password', label: 'GOTV password', description: 'Write-only. Password for GOTV spectators.', type: 'password', maxLength: 32 },
	{ name: 'mp_maxrounds', label: 'Max rounds', description: 'Rounds per map (0 = unlimited).', type: 'int', min: 0, max: 60 },
	{ name: 'mp_freezetime', label: 'Freeze time', description: 'Seconds of buy time at round start.', type: 'int', min: 0, max: 60 },
	{ name: 'mp_roundtime', label: 'Round time', description: 'Round length in minutes.', type: 'float', min: 0.5, max: 60 },
	{ name: 'mp_overtime_enable', label: 'Overtime', description: 'Play overtime on a tied score.', type: 'bool' },
	{ name: 'tv_enable', label: 'GOTV', description: 'Enable GOTV and demo recording.', type: 'bool' },
	{ name: 'sv_cheats', label: 'Cheats', description: 'Allow cheat commands. Never enable during a real match.', type: 'bool' },
	{ name: 'bot_quota', label: 'Bot quota', description: 'Number of bots on the server.', type: 'int', min: 0, max: 64 },
	{ name: 'bot_quota_mode', label: 'Bot quota mode', description: 'How bots fill the quota.', type: 'enum', options: ['normal', 'fill', 'match'] },
];

const DEFINITIONS_BY_NAME = new Map(SETTING_DEFINITIONS.map((d) => [d.name, d]));

export function getSettingDefinition(name: string): SettingDefinition | undefined {
	return DEFINITIONS_BY_NAME.get(name);
}

/** Cvars whose value is never sent back to the client. */
export function isWriteOnly(def: SettingDefinition): boolean {
	return def.type === 'password';
}

// Anything that could end or extend a console command, quote a value, or escape: ; " ' ` \ and C0/C1 controls.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[;"'`\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

export function containsForbiddenChars(value: string): boolean {
	return FORBIDDEN_CHARS.test(value);
}

export type ValidatedValue = { ok: true; value: string } | { ok: false; error: string };

/** Validates one raw value against its definition and returns the exact string to send to the server. */
export function validateSettingValue(def: SettingDefinition, raw: unknown): ValidatedValue {
	if (typeof raw === 'string' && containsForbiddenChars(raw)) {
		return { ok: false, error: `${def.name}: contains characters that are not allowed` };
	}

	switch (def.type) {
		case 'bool': {
			if (raw === true || raw === 1 || raw === '1' || raw === 'true') return { ok: true, value: '1' };
			if (raw === false || raw === 0 || raw === '0' || raw === 'false') return { ok: true, value: '0' };
			return { ok: false, error: `${def.name}: must be on or off` };
		}
		case 'int': {
			const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
			if (!/^-?\d{1,9}$/.test(text)) return { ok: false, error: `${def.name}: must be a whole number` };
			const n = Number.parseInt(text, 10);
			if (n < (def.min ?? -Infinity) || n > (def.max ?? Infinity)) return { ok: false, error: `${def.name}: must be between ${def.min} and ${def.max}` };
			return { ok: true, value: String(n) };
		}
		case 'float': {
			const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
			if (!/^-?\d{1,6}(\.\d{1,3})?$/.test(text)) return { ok: false, error: `${def.name}: must be a number` };
			const n = Number.parseFloat(text);
			if (n < (def.min ?? -Infinity) || n > (def.max ?? Infinity)) return { ok: false, error: `${def.name}: must be between ${def.min} and ${def.max}` };
			return { ok: true, value: String(n) };
		}
		case 'enum': {
			if (typeof raw !== 'string' || !def.options?.includes(raw)) return { ok: false, error: `${def.name}: must be one of ${def.options?.join(', ')}` };
			return { ok: true, value: raw };
		}
		case 'string':
		case 'password': {
			if (typeof raw !== 'string') return { ok: false, error: `${def.name}: must be text` };
			const text = raw.trim();
			if (text.length < 1) return { ok: false, error: `${def.name}: cannot be empty` };
			if (text.length > (def.maxLength ?? 64)) return { ok: false, error: `${def.name}: at most ${def.maxLength ?? 64} characters` };
			return { ok: true, value: text };
		}
	}
}

/** Builds the console line for a validated value. Strings are quoted; quotes were already rejected, so this cannot be broken out of. */
export function buildSetCommand(def: SettingDefinition, validatedValue: string): string {
	const quoted = def.type === 'string' || def.type === 'password' || def.type === 'enum';
	return quoted ? `${def.name} "${validatedValue}"` : `${def.name} ${validatedValue}`;
}

export const settingsPatchSchema = z
	.object({ settings: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])) })
	.strict()
	.superRefine((data, ctx) => {
		const keys = Object.keys(data.settings);
		if (keys.length === 0) ctx.addIssue({ code: 'custom', message: 'No settings provided' });
		if (keys.length > SETTING_DEFINITIONS.length) ctx.addIssue({ code: 'custom', message: 'Too many settings' });
		for (const key of keys) {
			const def = getSettingDefinition(key);
			if (!def) {
				ctx.addIssue({ code: 'custom', message: `${key}: setting is not allowed`, path: ['settings', key] });
				continue;
			}
			const result = validateSettingValue(def, data.settings[key]);
			if (!result.ok) ctx.addIssue({ code: 'custom', message: result.error, path: ['settings', key] });
		}
	});

/**
 * Extracts a cvar's current value from the server's reply to querying it, e.g.
 *   "mp_maxrounds" = "30" ( def. "0" ) game replicated - Max number of rounds
 *   mp_maxrounds = 30
 */
export function parseCvarValue(output: string, name: string): string | null {
	const text = typeof output === 'string' ? output : '';
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const quoted = new RegExp(`"${escaped}"\\s*=\\s*"([^"]*)"`, 'i').exec(text);
	if (quoted) return quoted[1];
	const bare = new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*(?:\\(|$)`, 'im').exec(text);
	return bare ? bare[1].trim() : null;
}
