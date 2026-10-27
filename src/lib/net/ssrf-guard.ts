import 'server-only';
import dns from 'dns';
import net from 'net';

/**
 * Shared SSRF guard for anything that fetches a user-controlled URL server-side (link previews,
 * remote image fetching for OG cards, …). Mirrors the DNS-rebinding-safe check originally built for
 * `src/app/api/news/link/route.ts`: the address that's checked is the one that's connected to (via
 * the `lookup` hook passed to http(s).request), so there's no gap between check and connect.
 */

// Loopback, private, CGNAT, link-local, multicast, reserved and documentation ranges.
const blocked = new net.BlockList();
for (const [addr, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.0.2.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['198.51.100.0', 24],
	['203.0.113.0', 24],
	['224.0.0.0', 4],
	['240.0.0.0', 4],
] as const) {
	blocked.addSubnet(addr, prefix, 'ipv4');
}
for (const [addr, prefix] of [
	['::', 128],
	['::1', 128],
	['64:ff9b::', 96],
	['100::', 64],
	['2001:db8::', 32],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8],
] as const) {
	blocked.addSubnet(addr, prefix, 'ipv6');
}

export function isPublicAddress(address: string): boolean {
	const family = net.isIP(address);
	if (family === 0) return false;
	if (family === 6) {
		const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return !blocked.check(mapped[1], 'ipv4');
		return !blocked.check(address, 'ipv6');
	}
	return !blocked.check(address, 'ipv4');
}

export class UnsafeUrlError extends Error {}

/** DNS lookup that refuses non-public addresses — hand this to http(s).request's `lookup` option. */
export const safeLookup: net.LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { all: true }, (err, addresses) => {
		if (err) return callback(err, '', 4);
		const list = addresses as dns.LookupAddress[];
		if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) {
			return callback(new UnsafeUrlError('Address not allowed'), '', 4);
		}
		if ((options as dns.LookupOptions).all) {
			(callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
		} else {
			callback(null, list[0].address, list[0].family);
		}
	});
};

/** Validates scheme/credentials/port/obvious-local-hostnames before a request is even attempted. IP
 *  literals skip DNS (and so skip `safeLookup`), so they're checked here directly. */
export function checkUrlIsSafe(raw: string): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new UnsafeUrlError('Invalid URL');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('Only http(s) links are supported');
	if (url.username || url.password) throw new UnsafeUrlError('Links with credentials are not supported');
	if (url.port && url.port !== '80' && url.port !== '443') throw new UnsafeUrlError('Only standard web ports are supported');
	const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
		throw new UnsafeUrlError('Address not allowed');
	}
	if (net.isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError('Address not allowed');
	return url;
}
