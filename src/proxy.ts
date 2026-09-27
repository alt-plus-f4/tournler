import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/helpers/permission-map';
import { checkRateLimit } from '@/lib/rate-limit';

// Route-level auth runs here once, before any rendering, instead of in layouts. It only decides
// "signed in?" and "staff?" from the JWT; it is a fast first gate, not the authorization layer:
// every page and API still checks permissions (and bans) on the server via getAuthSession(),
// because a middleware check alone must never be the only thing protecting data.
//
// next-auth v4's `next-auth/middleware` re-export isn't recognized by Next 16's proxy export check,
// so this is written out explicitly.

/**
 * Coarse, best-effort rate limits for our own API routes (see docs/SCALING_AT_1000_USERS.md #3). Order
 * matters: the first matching pattern wins, so put more specific routes before the `/api/` catch-all.
 * See src/lib/rate-limit.ts for why this is per-instance, not a distributed guarantee.
 */
const API_RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number; label: string }[] = [
	// MatchZy fires round_end every round of every live match — generous, but bounded, so a
	// misbehaving/malicious game server can't flood this without limit (see doc item #6).
	{ pattern: /^\/api\/matches\/game-state(\/matchzy)?\/?$/, limit: 120, windowMs: 10_000, label: 'game-state' },
	// Runs transactional bracket generation for every due tournament; only ever needs to run every
	// few minutes (the cron interval) or a handful of times by an admin.
	{ pattern: /^\/api\/tournaments\/check-start\/?$/, limit: 10, windowMs: 60_000, label: 'check-start' },
	// Sign-in/callback/Steam OpenID endpoints: classic credential-stuffing/spam surface.
	{ pattern: /^\/api\/auth\//, limit: 30, windowMs: 60_000, label: 'auth' },
	// Fallback for every other API route (forum posting, team invites, etc.) — generous enough not
	// to bother normal usage, present so nothing is completely unbounded.
	{ pattern: /^\/api\//, limit: 180, windowMs: 60_000, label: 'api-default' },
];

function clientIp(request: NextRequest): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) return forwardedFor.split(',')[0].trim();
	return request.headers.get('x-real-ip') ?? 'unknown';
}

export default async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// API routes handle their own auth (see route handlers / docs/ROLE_AND_API_GUIDE.md) — proxy only
	// adds a rate-limit gate here, it must never redirect/require a session for these.
	if (pathname.startsWith('/api/')) {
		const rule = API_RATE_LIMITS.find((r) => r.pattern.test(pathname));
		if (rule) {
			const allowed = checkRateLimit(`${rule.label}:${clientIp(request)}`, rule.limit, rule.windowMs);
			if (!allowed) {
				return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
			}
		}
		return NextResponse.next();
	}

	const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

	// Sign-in/up pages are for signed-out visitors; doing this here lets those pages be static.
	if (pathname === '/sign-in' || pathname === '/sign-up') {
		return token ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
	}

	if (!token) {
		const signInUrl = new URL('/sign-in', request.url);
		signInUrl.searchParams.set('callbackUrl', request.url);
		return NextResponse.redirect(signInUrl);
	}

	// /admin is staff-only. The role on the token is refreshed from the DB by the jwt callback;
	// each admin page still checks its specific permission.
	if (pathname.startsWith('/admin') && !isAdminRole(token.role as Parameters<typeof isAdminRole>[0])) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

// Every matched non-API path needs a signed-in user (except the sign-in/up pages, which need the
// opposite); /admin additionally needs a staff role. `/api/:path*` is matched too, but only for the
// rate-limit gate above — it never reaches (or needs) the auth checks below.
export const config = { matcher: ['/admin/:path*', '/forum/new', '/news/new', '/news/:id/edit', '/sign-in', '/sign-up', '/api/:path*'] };
