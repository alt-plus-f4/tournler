import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { signConvexToken } from '@/lib/convex-auth';

/** Short-lived Convex identity token for the signed-in user (see src/lib/convex-auth.ts). */
export async function GET() {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		return NextResponse.json(signConvexToken(session.user.id), { headers: { 'Cache-Control': 'no-store' } });
	} catch (error) {
		console.error('Failed to sign Convex token', error);
		return NextResponse.json({ error: 'Notifications are not configured' }, { status: 503 });
	}
}
