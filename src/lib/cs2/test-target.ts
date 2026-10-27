import 'server-only';
import dns from 'dns';
import net from 'net';
import { isPublicAddress } from '@/lib/net/ssrf-guard';
import type { Cs2ServerConfig } from './server-pool';

export type HostCheck = { ok: true; address: string } | { ok: false };

/**
 * Vets the host an admin typed into "Test connection" before the server connects to it.
 * - Outside production anything goes (local docker dev).
 * - A host already in the pool (public ip or rconHost) is allowed, so localhost and
 *   host.docker.internal keep working when the pool uses them.
 * - Otherwise the host must be a public address: IP literals are checked directly, names are
 *   resolved and every resulting address must be public. The resolved address is returned so the
 *   connection goes to the IP that was checked (no DNS rebinding gap).
 */
export async function checkTestHost(host: string, pool: Pick<Cs2ServerConfig, 'ip' | 'rconHost'>[], env: string | undefined = process.env.NODE_ENV): Promise<HostCheck> {
	const h = host.replace(/^\[|\]$/g, '').toLowerCase();
	if (env !== 'production') return { ok: true, address: host };
	if (pool.some((s) => s.ip.toLowerCase() === h || s.rconHost.toLowerCase() === h)) return { ok: true, address: host };

	if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return { ok: false };
	if (net.isIP(h)) return isPublicAddress(h) ? { ok: true, address: h } : { ok: false };

	try {
		const list = await dns.promises.lookup(h, { all: true });
		if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) return { ok: false };
		return { ok: true, address: list[0].address };
	} catch {
		return { ok: false };
	}
}
