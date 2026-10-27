import { z } from 'zod';
import type { Cs2ServerConfig } from './server-pool';

/** Ids that would collide with static API segments under /api/admin/servers. */
export const RESERVED_SERVER_IDS = ['test', 'preview', 'status'];

const hostSchema = z
	.string()
	.trim()
	.min(1, 'Host is required')
	.max(253)
	.regex(/^([A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?|[0-9A-Fa-f:]+)$/, 'Use a hostname or IP address only');
const portSchema = z.number().int().min(1, 'Port must be 1-65535').max(65535, 'Port must be 1-65535');

export const poolEntrySchema = z
	.object({
		id: z
			.string()
			.trim()
			.min(1, 'Server id is required')
			.max(64)
			.regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore')
			.refine((id) => !RESERVED_SERVER_IDS.includes(id.toLowerCase()), 'This id is reserved'),
		ip: hostSchema,
		port: portSchema,
		rconHost: hostSchema.optional(),
		rconPort: portSchema.optional(),
		// eslint-disable-next-line no-control-regex
		rconPassword: z.string().min(1, 'RCON password is required').max(128).regex(/^[^\u0000-\u001f\u007f]*$/, 'Password contains control characters'),
	})
	.strict();

export type PoolEntryInput = z.infer<typeof poolEntrySchema>;

/** Effective RCON endpoint for an input: host defaults to the public IP, port to game port + 1. */
export function effectiveRcon(entry: Pick<PoolEntryInput, 'ip' | 'port' | 'rconHost' | 'rconPort'>) {
	return { host: entry.rconHost ?? entry.ip, port: entry.rconPort ?? entry.port + 1 };
}

export const KEEP_EXISTING = '<keep existing>';

/** Next free numeric-looking id ("03") and the next game port, 10 above the highest in the pool (27015 when empty). */
export function suggestNext(pool: Pick<Cs2ServerConfig, 'id' | 'port'>[]): { id: string; port: number } {
	const nums = pool.map((s) => (/^\d+$/.test(s.id) ? Number.parseInt(s.id, 10) : 0));
	let n = Math.max(0, ...nums, pool.length) + 1;
	const taken = new Set(pool.map((s) => s.id));
	while (taken.has(String(n).padStart(2, '0'))) n++;
	const maxPort = pool.length ? Math.max(...pool.map((s) => s.port)) : 27005;
	return { id: String(n).padStart(2, '0'), port: Math.min(maxPort + 10, 65000) };
}

export function findPoolConflict(pool: Pick<Cs2ServerConfig, 'id' | 'ip' | 'port'>[], entry: Pick<PoolEntryInput, 'id' | 'ip' | 'port'>): string | null {
	if (pool.some((s) => s.id === entry.id)) return `A server with id "${entry.id}" already exists`;
	if (pool.some((s) => s.ip.toLowerCase() === entry.ip.toLowerCase() && s.port === entry.port)) return 'A server with this address and port already exists';
	return null;
}

function toJsonEntry(entry: { id: string; ip: string; port: number; rconHost?: string; rconPort?: number; rconPassword: string }) {
	return {
		id: entry.id,
		ip: entry.ip,
		port: entry.port,
		...(entry.rconHost && entry.rconHost !== entry.ip ? { rconHost: entry.rconHost } : {}),
		rconPort: entry.rconPort ?? entry.port + 1,
		rconPassword: entry.rconPassword,
	};
}

/**
 * Builds the copy-paste output for adding a server. Every EXISTING entry's rconPassword is
 * replaced by a placeholder so existing secrets never reach the browser; only the password the
 * admin just typed for the new entry appears.
 */
export function buildPoolOutput(pool: Cs2ServerConfig[], entry: PoolEntryInput) {
	const newEntry = toJsonEntry(entry);
	const existing = pool.map((s) => toJsonEntry({ id: s.id, ip: s.ip, port: s.port, rconHost: s.rconHost, rconPort: s.rconPort, rconPassword: KEEP_EXISTING }));
	const index = /^\d+$/.test(entry.id) ? Number.parseInt(entry.id, 10) : pool.length + 1;
	const nn = String(index).padStart(2, '0');
	const rconPort = newEntry.rconPort;

	const env = [
		`CS2_SERVER_${index}_PORT=${entry.port}`,
		`CS2_SERVER_${index}_RCON_PORT=${rconPort}`,
		`CS2_SERVER_${index}_PW=<pick a password>`,
		`CS2_SERVER_${index}_RCONPW=<the RCON password you entered>`,
		`CS2_SERVER_${index}_TV_PW=<pick a password>`,
	].join('\n');

	const p = (v: string) => `\${CS2_SERVER_${index}_${v}`;
	const compose = [
		`  cs2-dedicated-${nn}:`,
		`    image: joedwards32/cs2`,
		`    container_name: cs2-dedicated-${nn}`,
		`    environment:`,
		`      - SRCDS_TOKEN=\${SRCDS_TOKEN}`,
		`      - CS2_SERVERNAME=${p('NAME:-[Tournler] CS2 Dedicated Server ' + nn)}}`,
		`      - CS2_LAN=0`,
		`      - CS2_PORT=${p('PORT:-' + entry.port)}}`,
		`      - CS2_RCON_PORT=${p('RCON_PORT:-' + rconPort)}}`,
		`      - CS2_PW=${p('PW')}}`,
		`      - CS2_RCONPW=${p('RCONPW')}}`,
		`      - TV_PW=${p('TV_PW')}}`,
		`      - TV_ENABLE=1`,
		`      - CS2_MAPGROUP=\${CS2_MAPGROUP:-}`,
		`      - CS2_STARTMAP=${p('STARTMAP:-de_dust2')}}`,
		`    volumes:`,
		`      - ./data/cs2-dedicated-${nn}:/home/steam/cs2-dedicated`,
		`      - ./settings/pre.sh:/home/steam/cs2-dedicated/pre.sh`,
		`      - ./settings/post.sh:/home/steam/cs2-dedicated/post.sh`,
		`      - ./settings/game/csgo/cfg/MatchZy:/home/steam/cs2-dedicated/game/csgo/cfg/MatchZy`,
		`      - ./.build-cache/counterstrikesharp-custom:/home/steam/cs2-dedicated/custom-counterstrikesharp:ro`,
		`    ports:`,
		`      - '${p('PORT:-' + entry.port)}}:${p('PORT:-' + entry.port)}}/tcp'`,
		`      - '${p('RCON_PORT:-' + rconPort)}}:${p('RCON_PORT:-' + rconPort)}}/tcp'`,
		`      - '${p('PORT:-' + entry.port)}}:${p('PORT:-' + entry.port)}}/udp'`,
		`    stdin_open: true`,
		`    tty: true`,
	].join('\n');

	return {
		entryJson: JSON.stringify(newEntry, null, 2),
		poolJson: JSON.stringify([...existing, newEntry]),
		compose,
		env,
	};
}
