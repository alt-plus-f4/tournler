import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
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
}
