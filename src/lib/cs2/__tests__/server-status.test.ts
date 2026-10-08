import { statusShowsMap } from '../server-status';

const STATUS = `---------spawngroups----
loaded spawngroup(  1)  : SV:  [1: de_mirage | main lump | mapload]
loaded spawngroup(  2)  : SV:  [2: maps/prefabs/de_mirage/3dskybox_mirage_legacy | main lump | mapload | point_prefab]
#end
--- SourceTV[0] Status ---
Game Time 01:08, Mod "csgo", Map "de_mirage"`;

describe('statusShowsMap', () => {
	it('matches the map named in the spawngroup line', () => {
		expect(statusShowsMap(STATUS, 'de_mirage')).toBe(true);
	});

	it('matches the map named in the SourceTV line alone', () => {
		expect(statusShowsMap('Game Time 00:10, Mod "csgo", Map "de_inferno"', 'de_inferno')).toBe(true);
	});

	it('does not match a different map', () => {
		expect(statusShowsMap(STATUS, 'de_dust2')).toBe(false);
	});

	it('requires an exact map name, not a prefix', () => {
		expect(statusShowsMap('loaded spawngroup(  1)  : SV:  [1: de_dust2_old | main lump | mapload]', 'de_dust2')).toBe(false);
	});

	it('is false for an empty response', () => {
		expect(statusShowsMap('', 'de_dust2')).toBe(false);
	});
});
