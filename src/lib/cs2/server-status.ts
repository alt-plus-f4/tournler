/**
 * Whether a CS2 `status` RCON response says the server is currently on `map`. Two lines in that
 * output name the loaded map, and either is enough (confirmed against a live server):
 *   loaded spawngroup(  1)  : SV:  [1: de_dust2 | main lump | mapload]
 *   Game Time 01:08, Mod "csgo", Map "de_dust2"
 * The match is exact on the map name, so `de_dust2` never matches `de_dust2_old`.
 */
export function statusShowsMap(status: string, map: string): boolean {
	const escaped = map.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`\\[\\d+:\\s*${escaped}\\s*\\|\\s*main lump`).test(status) || new RegExp(`Map\\s+"${escaped}"`).test(status);
}
