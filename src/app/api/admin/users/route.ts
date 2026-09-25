import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

export async function GET() {
	try {
		const session = await getAuthSession();
		const sessionUser = session?.user;

		if (!sessionUser) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!(await userHasPermission(sessionUser.id, 'users:manage'))) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const [usersInTeam, usersNotInTeam] = await Promise.all([
			db.user.count({ where: { teams: { some: {} } } }),
			db.user.count({ where: { teams: { none: {} } } }),
		]);

		return NextResponse.json({ usersInTeam, usersNotInTeam });
	} catch (error) {
		console.error('Error fetching user stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
