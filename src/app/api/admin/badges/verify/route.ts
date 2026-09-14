import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

const VERIFIED_BADGE = {
	name: 'Verified',
	description: 'Verified account',
	icon: 'verified',
	color: '#3b82f6',
	isOverlay: true,
};

async function authorize() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
	}
	return { session };
}

/**
 * POST /api/admin/badges/verify — one-click verify: ensures the "Verified" badge definition
 * exists (creating it on first use) and awards it to the given user, in a single call.
 * DELETE /api/admin/badges/verify — revoke the "Verified" badge from the given user.
 */
export async function POST(request: Request) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { userId } = await request.json();
		if (!userId || typeof userId !== 'string') {
			return NextResponse.json({ error: 'userId is required' }, { status: 400 });
		}

		const badge = await db.badge.upsert({
			where: { name: VERIFIED_BADGE.name },
			update: {},
			create: VERIFIED_BADGE,
		});

		const award = await db.userBadge.upsert({
			where: { userId_badgeId: { userId, badgeId: badge.id } },
			create: { userId, badgeId: badge.id },
			update: {},
			include: { badge: true },
		});

		return NextResponse.json({ award }, { status: 201 });
	} catch (error) {
		console.error('Error verifying user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { userId } = await request.json();
		if (!userId || typeof userId !== 'string') {
			return NextResponse.json({ error: 'userId is required' }, { status: 400 });
		}

		const badge = await db.badge.findUnique({ where: { name: VERIFIED_BADGE.name } });
		if (badge) {
			await db.userBadge.deleteMany({ where: { userId, badgeId: badge.id } });
		}

		return NextResponse.json({ message: 'Verification revoked' });
	} catch (error) {
		console.error('Error revoking verification:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
