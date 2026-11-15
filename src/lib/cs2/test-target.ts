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

/**
 * Vets a host agent URL before the app talks to it. Production requires https and a public
 * address (same SSRF rules as the RCON test); elsewhere http and local addresses are fine for dev.
 * `knownHosts` are hosts already registered, which stay allowed (e.g. a private-network agent).
 */
export async function checkAgentUrl(rawUrl: string, knownHosts: string[], env: string | undefined = process.env.NODE_ENV): Promise<{ ok: true } | { ok: false; reason: string }> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return { ok: false, reason: 'Agent URL is not a valid URL' };
	}
	if (env === 'production' && url.protocol !== 'https:') return { ok: false, reason: 'Agent URL must use https in production' };
	if (url.username || url.password) return { ok: false, reason: 'Agent URL must not contain credentials' };
	const check = await checkTestHost(
		url.hostname,
		knownHosts.map((h) => ({ ip: h, rconHost: h })),
		env,
	);
	return check.ok ? { ok: true } : { ok: false, reason: 'Agent host is not allowed. Use a public address.' };
}
