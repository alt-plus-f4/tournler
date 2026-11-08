/**
 * @jest-environment node
 */
import { buildRunArgs, containerName, findPortConflict, loadConfig, matchRoute, pickToken, sign, validateSpec, verify, HttpError, type ServerSpec } from '../agent';
import { signAgentRequest, verifyAgentRequest } from '@/lib/cs2/agent-signature';

const SECRET = 's'.repeat(32);
const spec: ServerSpec = {
	slug: 'eu-1-3',
	name: '[Tournler] EU #3',
	gamePort: 27035,
	rconPort: 27036,
	tvPort: 27040,
	gamePassword: 'g_pw-1',
	rconPassword: 'r_pw-1',
	tvPassword: 't_pw-1',
	startMap: 'de_dust2',
};
const cfg = { image: 'joedwards32/cs2', settingsDir: '/opt/tournler/cs-docker/settings', customCssDir: null };

describe('request signing', () => {
	const req = { method: 'POST', path: '/servers', body: '{"a":1}', timestamp: 1_700_000_000_000 };

	it('produces exactly the same signature as the app', () => {
		expect(sign(SECRET, req)).toBe(signAgentRequest(SECRET, req));
	});

	it('accepts what the app signs, and the app accepts what the agent signs', () => {
		const signature = signAgentRequest(SECRET, req);
		expect(verify(SECRET, { ...req, signature }, req.timestamp + 1000)).toBe(true);
		expect(verifyAgentRequest(SECRET, { ...req, signature: sign(SECRET, req) }, req.timestamp + 1000)).toBe(true);
	});

	it('rejects a wrong secret, a changed body/path/method, and a bad signature', () => {
		const signature = sign(SECRET, req);
		const now = req.timestamp;
		expect(verify('x'.repeat(32), { ...req, signature }, now)).toBe(false);
		expect(verify(SECRET, { ...req, body: '{"a":2}', signature }, now)).toBe(false);
		expect(verify(SECRET, { ...req, path: '/servers/x', signature }, now)).toBe(false);
		expect(verify(SECRET, { ...req, method: 'DELETE', signature }, now)).toBe(false);
		expect(verify(SECRET, { ...req, signature: 'zz' }, now)).toBe(false);
		expect(verify(SECRET, { ...req, signature: '' }, now)).toBe(false);
	});

	it('rejects requests outside the 60s window (replay)', () => {
		const signature = sign(SECRET, req);
		expect(verify(SECRET, { ...req, signature }, req.timestamp + 61_000)).toBe(false);
		expect(verify(SECRET, { ...req, signature }, req.timestamp - 61_000)).toBe(false);
		expect(verify(SECRET, { ...req, timestamp: NaN, signature }, req.timestamp)).toBe(false);
	});
});

describe('validateSpec', () => {
	it('accepts a well-formed spec', () => {
		expect(validateSpec(spec)).toEqual(spec);
	});

	it.each([
		['slug with a slash', { slug: '../etc' }],
		['uppercase slug', { slug: 'EU-1' }],
		['port below 1024', { gamePort: 80 }],
		['non-integer port', { rconPort: 27016.5 }],
		['duplicate ports', { rconPort: 27035 }],
		['password with a space', { rconPassword: 'a b' }],
		['password with a quote', { gamePassword: 'a"b' }],
		['name with a quote', { name: 'my "server"' }],
		['name with a newline', { name: 'a\nb' }],
		['map with a path', { startMap: '../x' }],
		['missing field', { tvPassword: undefined }],
	])('rejects %s', (_label, patch) => {
		expect(() => validateSpec({ ...spec, ...patch })).toThrow(HttpError);
	});

	it('rejects non-objects', () => {
		expect(() => validateSpec(null)).toThrow(HttpError);
		expect(() => validateSpec('x')).toThrow(HttpError);
	});
});

describe('matchRoute', () => {
	it('matches the API surface', () => {
		expect(matchRoute('GET', '/health')).toEqual({ name: 'health' });
		expect(matchRoute('GET', '/servers')).toEqual({ name: 'list' });
		expect(matchRoute('POST', '/servers')).toEqual({ name: 'create' });
		expect(matchRoute('POST', '/base/update')).toEqual({ name: 'baseUpdate' });
		expect(matchRoute('DELETE', '/servers/eu-1-2')).toEqual({ name: 'remove', slug: 'eu-1-2' });
		expect(matchRoute('POST', '/servers/eu-1-2/restart')).toEqual({ name: 'power', slug: 'eu-1-2', action: 'restart' });
	});

	it('rejects everything else, including bad slugs and verbs', () => {
		expect(matchRoute('GET', '/servers/eu-1')).toBeNull();
		expect(matchRoute('DELETE', '/servers/../x')).toBeNull();
		expect(matchRoute('POST', '/servers/EU/start')).toBeNull();
		expect(matchRoute('POST', '/servers/eu-1/explode')).toBeNull();
		expect(matchRoute('PUT', '/servers')).toBeNull();
		expect(matchRoute('GET', '/')).toBeNull();
	});
});

describe('buildRunArgs', () => {
	const args = buildRunArgs(spec, cfg, 'TOKEN123', '/srv/cs2/servers/eu-1-3/merged');

	it('names the container, never restarts via docker, and labels it', () => {
		expect(args.slice(0, 3)).toEqual(['run', '-d', '-it']);
		expect(args[args.indexOf('--name') + 1]).toBe(containerName('eu-1-3'));
		expect(args[args.indexOf('--restart') + 1]).toBe('no');
		expect(args).toContain('tournler.slug=eu-1-3');
	});

	it('passes each setting as its own argument (no shell involved)', () => {
		expect(args).toEqual(expect.arrayContaining(['CS2_PORT=27035', 'CS2_RCON_PORT=27036', 'CS2_RCONPW=r_pw-1', 'CS2_PW=g_pw-1', 'TV_PW=t_pw-1', 'SRCDS_TOKEN=TOKEN123', 'CS2_STARTMAP=de_dust2']));
	});

	it('mounts the merged game dir plus the settings, and publishes game/RCON tcp and game/GOTV udp', () => {
		expect(args).toContain('/srv/cs2/servers/eu-1-3/merged:/home/steam/cs2-dedicated');
		expect(args).toContain('/opt/tournler/cs-docker/settings/pre.sh:/home/steam/cs2-dedicated/pre.sh');
		expect(args).toEqual(expect.arrayContaining(['27035:27035/tcp', '27036:27036/tcp', '27035:27035/udp', '27040:27040/udp']));
		expect(args[args.length - 1]).toBe('joedwards32/cs2');
	});

	it('only mounts the custom CounterStrikeSharp build when configured, read-only', () => {
		expect(args.join(' ')).not.toContain('custom-counterstrikesharp');
		const withCss = buildRunArgs(spec, { ...cfg, customCssDir: '/opt/css' }, null, '/m');
		expect(withCss).toContain('/opt/css:/home/steam/cs2-dedicated/custom-counterstrikesharp:ro');
		expect(withCss.join(' ')).not.toContain('SRCDS_TOKEN');
	});
});

describe('pickToken', () => {
	it('hands out the first token no server uses', () => {
		expect(pickToken(['a', 'b', 'c'], [0, null, 2])).toEqual({ index: 1, token: 'b' });
	});

	it('refuses when tokens run out or none are configured', () => {
		expect(() => pickToken(['a'], [0])).toThrow(/in use/);
		expect(() => pickToken([], [])).toThrow(/No Steam/);
	});
});

describe('findPortConflict', () => {
	const other = { ...spec, slug: 'eu-1-1', gamePort: 27015, rconPort: 27016, tvPort: 27020 };

	it('allows a clear slot', () => expect(findPortConflict(spec, [other])).toBeNull());
	it('catches a reused slug', () => expect(findPortConflict({ ...spec, slug: 'eu-1-1' }, [other])).toMatch(/already exists/));
	it('catches any overlapping port', () => expect(findPortConflict({ ...spec, tvPort: 27016 }, [other])).toMatch(/already used/));
});

describe('loadConfig', () => {
	const base = { AGENT_SECRET: SECRET, SETTINGS_DIR: '/s' };

	it('reads defaults and a token list', () => {
		const c = loadConfig({ ...base, SRCDS_TOKENS: 'a, b ,,c', SHARE_MODE: 'overlay' });
		expect(c.tokens).toEqual(['a', 'b', 'c']);
		expect(c.dataDir).toBe('/srv/cs2');
		expect(c.image).toBe('joedwards32/cs2');
	});

	it('requires a long secret, a settings dir and a valid mode', () => {
		expect(() => loadConfig({ ...base, AGENT_SECRET: 'short' })).toThrow(/AGENT_SECRET/);
		expect(() => loadConfig({ AGENT_SECRET: SECRET })).toThrow(/SETTINGS_DIR/);
		expect(() => loadConfig({ ...base, SHARE_MODE: 'zfs' })).toThrow(/SHARE_MODE/);
	});
});
