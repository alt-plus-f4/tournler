import { describeRconError, parseServerStatus } from '../parse-status';

const FULL = `Server: Running [0.0.0.0:27015]
hostname: Tournler #1
version : 1.40.2.3/14023 10392 secure  public
os      :  Linux
type    :  community dedicated
map     : de_mirage
players : 3 humans, 2 bots (10 max) (not hibernating)
loaded spawngroup(  1)  : SV:  [1: de_dust2 | main lump | mapload]
Game Time 01:08, Mod "csgo", Map "de_dust2"
`;

describe('parseServerStatus', () => {
	it('parses a full status response and prefers the loaded spawngroup map', () => {
		expect(parseServerStatus(FULL)).toEqual({
			hostname: 'Tournler #1',
			version: '1.40.2.3/14023 10392 secure public',
			map: 'de_dust2',
			humans: 3,
			bots: 2,
			maxPlayers: 10,
			hibernating: false,
		});
	});

	it('falls back to the Game Time line, then the map line', () => {
		expect(parseServerStatus('Game Time 00:10, Mod "csgo", Map "de_inferno"').map).toBe('de_inferno');
		expect(parseServerStatus('map     : de_nuke\nplayers : 0 humans, 0 bots').map).toBe('de_nuke');
	});

	it('handles players without a max and singular forms', () => {
		const p = parseServerStatus('players : 1 human, 1 bot');
		expect(p).toMatchObject({ humans: 1, bots: 1, maxPlayers: null });
	});

	it('detects hibernation', () => {
		expect(parseServerStatus('players : 0 humans, 0 bots (64 max) (hibernating)').hibernating).toBe(true);
	});

	it('returns nulls for empty or garbage input and never throws', () => {
		const empty = { hostname: null, version: null, map: null, humans: null, bots: null, maxPlayers: null, hibernating: false };
		expect(parseServerStatus('')).toEqual(empty);
		expect(parseServerStatus('nonsense\n\n???')).toEqual(empty);
		expect(parseServerStatus(undefined as unknown as string)).toEqual(empty);
	});
});

describe('describeRconError', () => {
	it.each([
		[new Error('connect ECONNREFUSED 127.0.0.1:27016'), 'RCON refused'],
		[new Error('timed out'), 'Timed out'],
		[new Error('getaddrinfo ENOTFOUND cs2.example'), 'Host not found'],
		[new Error('Unable to authenticate: wrong password'), 'RCON auth failed'],
		[new Error('something odd'), 'Unreachable'],
	])('maps %s', (err, expected) => {
		expect(describeRconError(err)).toBe(expected);
	});

	it('never includes the raw message or stack', () => {
		expect(describeRconError(new Error('at secret/path/file.ts:12'))).toBe('Unreachable');
	});
});
