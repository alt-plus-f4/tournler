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

const VISIBILITY_FIELDS = ['showDiscord', 'showSteam'] as const;

/**
 * Self-service profile privacy: `{ showDiscord?: boolean, showSteam?: boolean }`. Always acts on the
 * session user, so only the profile owner can change their own flags.
 */
export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
	}

	const data: Partial<Record<(typeof VISIBILITY_FIELDS)[number], boolean>> = {};
	for (const key of VISIBILITY_FIELDS) {
		if (body[key] === undefined) continue;
		if (typeof body[key] !== 'boolean') return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
		data[key] = body[key];
	}
	if (Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Send showDiscord and/or showSteam' }, { status: 400 });
	}

	try {
		const user = await db.user.update({ where: { id: session.user.id }, data, select: { showDiscord: true, showSteam: true } });
		return NextResponse.json({ visibility: user });
	} catch (error) {
		console.error('Error updating profile visibility:', error);
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
