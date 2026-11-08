import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { isBadgeId } from '@/lib/badges/placement';

/**
 * PATCH /api/user/badges — hide or show one of your own awards: `{ badgeId: number, hidden: boolean }`.
 * Acts on the session user only. 403 while the site doesn't allow player badge choice
 * (SiteSettings.playerBadgeChoice); hidden flags are ignored for display while it's off anyway.
 */
export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object' || !isBadgeId(body.badgeId) || typeof body.hidden !== 'boolean') {
		return NextResponse.json({ error: 'Send { badgeId: number, hidden: boolean }' }, { status: 400 });
	}

	try {
		if (!(await getSiteSettings()).playerBadgeChoice) return NextResponse.json({ error: 'Hiding badges is turned off' }, { status: 403 });

		const { count } = await db.userBadge.updateMany({ where: { userId: session.user.id, badgeId: body.badgeId }, data: { hidden: body.hidden } });
		if (count === 0) return NextResponse.json({ error: 'You don’t have that badge' }, { status: 404 });
		return NextResponse.json({ badgeId: body.badgeId, hidden: body.hidden });
	} catch (error) {
		console.error('Error updating badge visibility:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
