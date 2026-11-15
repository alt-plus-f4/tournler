import { getServerPool } from './server-pool';
import { getLiveStatus } from './server-live';

/**
 * Probes every registered server over RCON. Each probe records its result on the server row
 * (`getLiveStatus` does that as a side effect), which is what the match allocator reads to skip
 * servers that are down. Env-only servers have no row and are skipped.
 */
export async function checkFleetHealth(): Promise<{ checked: number; online: number; servers: { id: string; online: boolean }[] }> {
	const pool = (await getServerPool()).filter((s) => s.dbId != null);
	const servers = await Promise.all(pool.map((s) => getLiveStatus(s, { fresh: true }).then(({ live }) => ({ id: s.id, online: live.online }))));
	return { checked: servers.length, online: servers.filter((r) => r.online).length, servers };
}
