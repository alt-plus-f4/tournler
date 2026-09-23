import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountDeletionBlockedError, deleteUserAccount } from '@/lib/account';

export async function GET() {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user?.id;
		const email = session.user?.email || '';

		let user = null;
		if (userId) {
			user = await db.user.findUnique({
				where: { id: userId },
				include: { discord: true, steam: true },
			});
		}

		if (!user && email) {
			user = await db.user.findUnique({
				where: { email },
				include: { discord: true, steam: true },
			});
		}

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ user }, { status: 200 });
	} catch (error) {
		console.error('Error fetching current user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** Self-service account deletion (GDPR erasure). Body must be `{ "confirm": "DELETE" }`. */
export async function DELETE(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (body?.confirm !== 'DELETE') {
		return NextResponse.json({ error: 'Confirm by sending { "confirm": "DELETE" }' }, { status: 400 });
	}

	try {
		const deleted = await deleteUserAccount(session.user.id);
		if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 });
		return NextResponse.json({ message: 'Account deleted' });
	} catch (error) {
		if (error instanceof AccountDeletionBlockedError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error deleting own account:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
