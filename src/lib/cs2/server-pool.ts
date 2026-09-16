export interface Cs2ServerConfig {
	id: string;
	ip: string;
	port: number;
	rconHost: string;
	rconPort: number;
	rconPassword: string;
	/** This server's `docker compose` service/container name — see `cs-docker/pool-controller/`. */
	containerName: string;
	/** The `CS2_SERVER_<N>_STARTMAP` env var `pool-controller` sets before recreating this specific container — see `docker-compose.yml`. */
	startMapEnvVar: string;
}

interface RawPoolEntry {
	id: string;
	ip: string;
	port: number;
	rconHost?: string;
	rconPort?: number;
	rconPassword: string;
	containerName?: string;
	startMapEnvVar?: string;
}

/**
 * The pool of real, persistent CS2 servers this deployment can provision matches onto — a
 * fixed-size fleet on one Docker host (see `cs-docker/`), not dynamically created/destroyed
 * containers. Configured via `CS2_SERVER_POOL` (a JSON array), one entry per server; falls back
 * to a single-entry pool built from the older `CS2_SERVER_IP`/`CS2_SERVER_PORT`/`CS2_RCON_HOST`/
 * `CS2_RCON_PORT`/`CS2_RCON_PASSWORD` vars if `CS2_SERVER_POOL` isn't set, so existing
 * single-server setups keep working unchanged.
 */
export function getServerPool(): Cs2ServerConfig[] {
	const raw = process.env.CS2_SERVER_POOL;
	if (raw) {
		let parsed: RawPoolEntry[];
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error('CS2_SERVER_POOL is not valid JSON');
		}
		return parsed.map((entry, index) => ({
			id: entry.id,
			ip: entry.ip,
			port: entry.port,
			rconHost: entry.rconHost ?? entry.ip,
			rconPort: entry.rconPort ?? entry.port + 1,
			rconPassword: entry.rconPassword,
			containerName: entry.containerName ?? `cs2-dedicated-${String(index + 1).padStart(2, '0')}`,
			startMapEnvVar: entry.startMapEnvVar ?? `CS2_SERVER_${index + 1}_STARTMAP`,
		}));
	}

	const ip = process.env.CS2_SERVER_IP || process.env.GAME_SERVER_IP || 'localhost';
	const port = Number.parseInt(process.env.CS2_SERVER_PORT || '27015', 10);
	const rconHost = process.env.CS2_RCON_HOST || ip;
	const rconPort = Number.parseInt(process.env.CS2_RCON_PORT || '27016', 10);
	const rconPassword = process.env.CS2_RCON_PASSWORD;
	if (!rconPassword) return [];

	return [{ id: 'default', ip, port, rconHost, rconPort, rconPassword, containerName: 'cs2-dedicated-01', startMapEnvVar: 'CS2_SERVER_1_STARTMAP' }];
}

/** Finds the pool entry matching a `GameServer` row's `connectIp`/`port` (the values recorded at allocation time). */
export function findServerByConnect(ip: string, port: number): Cs2ServerConfig | undefined {
	return getServerPool().find((s) => s.ip === ip && s.port === port);
}
