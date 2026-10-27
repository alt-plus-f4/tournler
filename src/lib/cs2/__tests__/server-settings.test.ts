import { buildSetCommand, containsForbiddenChars, getSettingDefinition, isWriteOnly, parseCvarValue, SETTING_DEFINITIONS, settingsPatchSchema, validateSettingValue } from '../server-settings';

const def = (name: string) => getSettingDefinition(name)!;

describe('validateSettingValue', () => {
	it('accepts valid values per type', () => {
		expect(validateSettingValue(def('mp_maxrounds'), 24)).toEqual({ ok: true, value: '24' });
		expect(validateSettingValue(def('mp_maxrounds'), '30')).toEqual({ ok: true, value: '30' });
		expect(validateSettingValue(def('mp_roundtime'), '1.92')).toEqual({ ok: true, value: '1.92' });
		expect(validateSettingValue(def('sv_cheats'), true)).toEqual({ ok: true, value: '1' });
		expect(validateSettingValue(def('tv_enable'), '0')).toEqual({ ok: true, value: '0' });
		expect(validateSettingValue(def('bot_quota_mode'), 'fill')).toEqual({ ok: true, value: 'fill' });
		expect(validateSettingValue(def('hostname'), '  Tournler #1  ')).toEqual({ ok: true, value: 'Tournler #1' });
	});

	it('rejects out-of-range, wrong-type and unknown enum values', () => {
		expect(validateSettingValue(def('mp_maxrounds'), 61).ok).toBe(false);
		expect(validateSettingValue(def('mp_maxrounds'), -1).ok).toBe(false);
		expect(validateSettingValue(def('mp_maxrounds'), '1.5').ok).toBe(false);
		expect(validateSettingValue(def('mp_maxrounds'), '12abc').ok).toBe(false);
		expect(validateSettingValue(def('mp_roundtime'), '0').ok).toBe(false);
		expect(validateSettingValue(def('sv_cheats'), 'maybe').ok).toBe(false);
		expect(validateSettingValue(def('bot_quota_mode'), 'evil').ok).toBe(false);
		expect(validateSettingValue(def('hostname'), '').ok).toBe(false);
		expect(validateSettingValue(def('hostname'), 'x'.repeat(65)).ok).toBe(false);
		expect(validateSettingValue(def('hostname'), 42).ok).toBe(false);
	});

	it.each([
		['semicolon', 'name; rcon_password x'],
		['double quote', 'a"b'],
		['single quote', "a'b"],
		['backtick', 'a`b'],
		['backslash', 'a\\b'],
		['newline', 'a\nquit'],
		['carriage return', 'a\rquit'],
		['null byte', 'a\u0000b'],
		['tab', 'a\tb'],
		['unicode line separator', 'a b'],
	])('rejects injection via %s in every text-like cvar', (_label, payload) => {
		for (const name of ['hostname', 'sv_password', 'tv_password', 'bot_quota_mode', 'mp_maxrounds', 'mp_roundtime', 'sv_cheats']) {
			expect(validateSettingValue(def(name), payload).ok).toBe(false);
		}
		expect(containsForbiddenChars(payload)).toBe(true);
	});
});

describe('buildSetCommand', () => {
	it('quotes strings and leaves numbers bare', () => {
		expect(buildSetCommand(def('hostname'), 'My Server')).toBe('hostname "My Server"');
		expect(buildSetCommand(def('mp_maxrounds'), '24')).toBe('mp_maxrounds 24');
		expect(buildSetCommand(def('bot_quota_mode'), 'fill')).toBe('bot_quota_mode "fill"');
	});

	it('a validated value can never produce more than one command', () => {
		const attempts = ['a;b', 'a"; quit; "', 'a\nb'];
		for (const a of attempts) {
			const v = validateSettingValue(def('hostname'), a);
			expect(v.ok).toBe(false);
		}
	});
});

describe('allowlist', () => {
	it('marks password cvars write-only', () => {
		expect(isWriteOnly(def('sv_password'))).toBe(true);
		expect(isWriteOnly(def('tv_password'))).toBe(true);
		expect(SETTING_DEFINITIONS.filter(isWriteOnly).map((d) => d.name)).toEqual(['sv_password', 'tv_password']);
	});

	it('does not contain dangerous cvars', () => {
		const names = SETTING_DEFINITIONS.map((d) => d.name);
		for (const bad of ['rcon_password', 'quit', 'exec', 'sv_rcon_banpenalty', 'changelevel']) expect(names).not.toContain(bad);
	});
});

describe('settingsPatchSchema', () => {
	it('accepts allowlisted settings', () => {
		expect(settingsPatchSchema.safeParse({ settings: { mp_maxrounds: 24, hostname: 'Hello', sv_cheats: false } }).success).toBe(true);
	});

	it('rejects unknown cvars, empty bodies, extra keys and bad values', () => {
		expect(settingsPatchSchema.safeParse({ settings: { rcon_password: 'x' } }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: { 'mp_maxrounds; quit': 1 } }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: {} }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: { mp_maxrounds: 1 }, extra: true }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: { mp_maxrounds: 999 } }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: { hostname: 'a;quit' } }).success).toBe(false);
		expect(settingsPatchSchema.safeParse({ settings: { hostname: null } }).success).toBe(false);
	});
});

describe('parseCvarValue', () => {
	it('parses the quoted CS2 format', () => {
		expect(parseCvarValue('"mp_maxrounds" = "30" ( def. "0" ) game replicated - Max rounds', 'mp_maxrounds')).toBe('30');
		expect(parseCvarValue('"hostname" = "My Server" ( def. "" )', 'hostname')).toBe('My Server');
	});

	it('parses the bare format and returns null when absent', () => {
		expect(parseCvarValue('mp_freezetime = 15', 'mp_freezetime')).toBe('15');
		expect(parseCvarValue('Unknown command', 'mp_freezetime')).toBeNull();
	});
});
