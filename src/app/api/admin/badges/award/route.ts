import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

async function authorize() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
	}
	return { session };
}

/** POST /api/admin/badges/award — award a badge to a user. Idempotent: awarding an already-held badge is a no-op success. */
export async function POST(request: Request) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { userId, badgeId } = await request.json();
		if (!userId || typeof userId !== 'string' || !badgeId || typeof badgeId !== 'number') {
			return NextResponse.json({ error: 'userId and badgeId are required' }, { status: 400 });
		}

		const award = await db.userBadge.upsert({
			where: { userId_badgeId: { userId, badgeId } },
			create: { userId, badgeId },
			update: {},
			include: { badge: true },
		});

		return NextResponse.json({ award }, { status: 201 });
	} catch (error) {
		console.error('Error awarding badge:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** DELETE /api/admin/badges/award — revoke a badge from a user. */
export async function DELETE(request: Request) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { userId, badgeId } = await request.json();
		if (!userId || typeof userId !== 'string' || !badgeId || typeof badgeId !== 'number') {
			return NextResponse.json({ error: 'userId and badgeId are required' }, { status: 400 });
		}

		await db.userBadge.deleteMany({ where: { userId, badgeId } });
		return NextResponse.json({ message: 'Badge revoked' });
	} catch (error) {
		console.error('Error revoking badge:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
