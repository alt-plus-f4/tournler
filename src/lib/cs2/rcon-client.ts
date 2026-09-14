import Rcon from 'rcon-srcds';

export interface RconTarget {
	host: string;
	port: number;
	password: string;
}

/**
 * Opens a short-lived RCON connection to one specific CS2 server in the pool (see
 * `src/lib/cs2/server-pool.ts`), runs `fn`, and always disconnects — this is a low-frequency
 * admin-triggered action (match start, manual sync) per server, not a hot path, so a connection
 * isn't kept pooled between calls.
 */
export async function withRcon<T>(target: RconTarget, fn: (rcon: Rcon) => Promise<T>): Promise<T> {
	const rcon = new Rcon({ host: target.host, port: target.port, timeout: 5000 });
	try {
		await rcon.authenticate(target.password);
		return await fn(rcon);
	} finally {
		await rcon.disconnect().catch(() => {});
	}
}
