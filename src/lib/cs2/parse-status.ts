/** Fields tolerantly extracted from a CS2 `status` RCON response. Anything not found is null. */
export interface ParsedServerStatus {
	hostname: string | null;
	version: string | null;
	map: string | null;
	humans: number | null;
	bots: number | null;
	maxPlayers: number | null;
	hibernating: boolean;
}

function lineValue(text: string, key: string): string | null {
	const match = new RegExp(`^[ \\t]*${key}[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, 'im').exec(text);
	return match ? match[1] : null;
}

/**
 * Parses the output of the CS2 `status` command. Known formats (confirmed against live servers):
 *   hostname: My Server
 *   version : 1.40.2.3/14023 10392 secure  public
 *   map     : de_dust2
 *   loaded spawngroup(  1)  : SV:  [1: de_dust2 | main lump | mapload]
 *   Game Time 01:08, Mod "csgo", Map "de_dust2"
 *   players : 2 humans, 1 bots (10 max) (not hibernating)
 * Every field is optional: a server mid map-change or running a different build still yields a
 * partial result instead of throwing.
 */
export function parseServerStatus(output: string): ParsedServerStatus {
	const text = typeof output === 'string' ? output : '';

	const hostname = lineValue(text, 'hostname');
	const versionRaw = lineValue(text, 'version');

	const spawnGroupMap = /\[\d+:\s*([^\s|\]]+)\s*\|\s*main lump/i.exec(text)?.[1];
	const gameTimeMap = /Map\s+"([^"]+)"/.exec(text)?.[1];
	const mapLine = lineValue(text, 'map');
	const map = spawnGroupMap ?? gameTimeMap ?? (mapLine ? mapLine.split(/\s+/)[0] : null) ?? null;

	const players = /players\s*:\s*(\d+)\s+humans?,\s*(\d+)\s+bots?(?:\s*\((\d+)\s*max\))?/i.exec(text);

	return {
		hostname: hostname || null,
		version: versionRaw ? versionRaw.replace(/\s+/g, ' ') : null,
		map,
		humans: players ? Number.parseInt(players[1], 10) : null,
		bots: players ? Number.parseInt(players[2], 10) : null,
		maxPlayers: players?.[3] ? Number.parseInt(players[3], 10) : null,
		hibernating: /\(hibernating\)|server is hibernating/i.test(text) && !/not hibernating/i.test(text),
	};
}

/** Maps a thrown RCON/network error to a short, stack-free reason for the UI. */
export function describeRconError(error: unknown): string {
	const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
	if (/ECONNREFUSED|refused/i.test(message)) return 'RCON refused';
	if (/timed? ?out|ETIMEDOUT|timeout/i.test(message)) return 'Timed out';
	if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) return 'Host not found';
	if (/EHOSTUNREACH|ENETUNREACH|unreachable/i.test(message)) return 'Host unreachable';
	if (/auth|password|denied/i.test(message)) return 'RCON auth failed';
	if (/ECONNRESET|EPIPE|closed|socket/i.test(message)) return 'Connection dropped';
	return 'Unreachable';
}
