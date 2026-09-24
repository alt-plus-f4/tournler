import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/helpers/permission-map';

// Route-level auth runs here once, before any rendering, instead of in layouts. It only decides
// "signed in?" and "staff?" from the JWT; it is a fast first gate, not the authorization layer:
// every page and API still checks permissions (and bans) on the server via getAuthSession(),
// because a middleware check alone must never be the only thing protecting data.
//
// next-auth v4's `next-auth/middleware` re-export isn't recognized by Next 16's proxy export check,
// so this is written out explicitly.

export default async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
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

// Every matched path needs a signed-in user (except the sign-in/up pages, which need the opposite);
// /admin additionally needs a staff role.
export const config = { matcher: ['/admin/:path*', '/profile/:path*', '/forum/new', '/news/new', '/news/:id/edit', '/sign-in', '/sign-up'] };
