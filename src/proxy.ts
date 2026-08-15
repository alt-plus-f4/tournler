import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// next-auth v4's `next-auth/middleware` default export re-export isn't
// recognized by Next 16's proxy/middleware static export check (it looks for
// an ExportDefaultDeclaration or a named "middleware"/"proxy" function in
// this file's own AST, not through a re-export from another package). This
// replicates the same behavior explicitly: redirect unauthenticated
// requests to the sign-in page with a callbackUrl, otherwise let them through.
export default async function proxy(request: NextRequest) {
	const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

	if (!token) {
		const signInUrl = new URL('/sign-in', request.url);
		signInUrl.searchParams.set('callbackUrl', request.url);
		return NextResponse.redirect(signInUrl);
	}

	return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/profile/:path*'] };
