import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
	const session = await getAuthSession();
	const sessionUser = session?.user;

	if (!sessionUser) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const role = await db.user.findFirst({
		where: { email: sessionUser.email ?? '' },
		select: { role: true },
	});

	if (role?.role !== 1) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const usersInTeam = await db.user.count({
		where: { cs2TeamId: { not: null } },
	});

	const usersNotInTeam = await db.user.count({
		where: { cs2TeamId: null },
	});

	return NextResponse.json({ usersInTeam, usersNotInTeam });
}
