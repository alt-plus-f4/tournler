import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import { requireContentManager } from '../_lib/auth';

const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

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

function isPublicAddress(address: string): boolean {
	const family = net.isIP(address);
	if (family === 0) return false;
	if (family === 6) {
		const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return !blocked.check(mapped[1], 'ipv4');
		return !blocked.check(address, 'ipv6');
	}
	return !blocked.check(address, 'ipv4');
}

class UnsafeUrlError extends Error {}

/**
 * DNS lookup that refuses non-public addresses. It's handed to http(s).request, so the address that's
 * checked is the one that's connected to (no gap for DNS rebinding between check and connect).
 */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
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

function checkUrl(raw: string): URL {
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
	// IP literals skip the lookup hook, so check them here.
	if (net.isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError('Address not allowed');
	return url;
}

type Fetched = { status: number; location?: string; contentType: string; body: string };

function request(url: URL, signal: AbortSignal): Promise<Fetched> {
	return new Promise((resolve, reject) => {
		const client = url.protocol === 'https:' ? https : http;
		const req = client.request(
			url,
			{
				method: 'GET',
				lookup: safeLookup,
				signal,
				headers: {
					'user-agent': 'TournlerLinkPreview/1.0 (+https://tournler)',
					accept: 'text/html,application/xhtml+xml',
					'accept-encoding': 'identity',
				},
			},
			(res) => {
				const status = res.statusCode ?? 0;
				const contentType = String(res.headers['content-type'] ?? '');
				if (status >= 300 && status < 400) {
					res.resume();
					return resolve({ status, location: res.headers.location, contentType, body: '' });
				}
				if (!/text\/html|application\/xhtml/i.test(contentType)) {
					res.destroy();
					return resolve({ status, contentType, body: '' });
				}
				const chunks: Buffer[] = [];
				let size = 0;
				res.on('data', (chunk: Buffer) => {
					size += chunk.length;
					chunks.push(chunk);
					// The <head> is all we need; stop reading big pages.
					if (size >= MAX_HTML_BYTES) res.destroy();
				});
				const finish = () => resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8').slice(0, MAX_HTML_BYTES) });
				res.on('end', finish);
				res.on('close', finish);
				res.on('error', reject);
			},
		);
		req.on('error', reject);
		req.end();
	});
}

function decodeEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();
}

function parseMeta(html: string, base: URL) {
	const head = html.slice(0, MAX_HTML_BYTES);
	const meta = new Map<string, string>();
	for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
		const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
		const content = tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
		if (key && content !== undefined && !meta.has(key)) meta.set(key, decodeEntities(content));
	}
	const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

	const title = meta.get('og:title') ?? meta.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag) : '');
	const description = meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description') ?? '';
	const siteName = meta.get('og:site_name') ?? '';
	let imageUrl: string | undefined;
	const rawImage = meta.get('og:image') ?? meta.get('twitter:image');
	if (rawImage) {
		try {
			const resolved = new URL(rawImage, base);
			if (resolved.protocol === 'https:' || resolved.protocol === 'http:') imageUrl = resolved.toString();
		} catch {
			// ignore malformed image URLs
		}
	}

	return {
		title: title.slice(0, 200),
		description: description.slice(0, 400),
		...(siteName ? { site_name: siteName.slice(0, 100) } : {}),
		...(imageUrl ? { image: { url: imageUrl } } : {}),
	};
}

async function preview(raw: string | null) {
	if (!raw) return NextResponse.json({ success: 0, error: 'Missing url' }, { status: 400 });

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		let url = checkUrl(raw);
		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			const res = await request(url, controller.signal);
			if (res.status >= 300 && res.status < 400 && res.location) {
				url = checkUrl(new URL(res.location, url).toString());
				continue;
			}
			if (res.status < 200 || res.status >= 300 || !res.body) {
				return NextResponse.json({ success: 0, error: 'Could not read that page' }, { status: 422 });
			}
			return NextResponse.json({ success: 1, link: url.toString(), meta: parseMeta(res.body, url) });
		}
		return NextResponse.json({ success: 0, error: 'Too many redirects' }, { status: 422 });
	} catch (error) {
		if (error instanceof UnsafeUrlError) return NextResponse.json({ success: 0, error: error.message }, { status: 400 });
		if (controller.signal.aborted) return NextResponse.json({ success: 0, error: 'The page took too long to respond' }, { status: 504 });
		return NextResponse.json({ success: 0, error: 'Could not read that page' }, { status: 422 });
	} finally {
		clearTimeout(timer);
	}
}

/**
 * GET /api/news/link?url=… (EditorJS LinkTool) or POST { url } — fetch og:title/description/image for a link card.
 * Requires `content:manage`. http(s) only; loopback/private/link-local targets are refused after DNS resolution.
 */
export async function GET(request: NextRequest) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;
	return preview(request.nextUrl.searchParams.get('url'));
}

export async function POST(request: Request) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;
	const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
	return preview(typeof body?.url === 'string' ? body.url : null);
}
