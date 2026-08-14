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

		if (!(await userHasPermission(session.user.id, 'teams:manage'))) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only need a per-team member count, not every member's full row.
		const teams = await db.cs2Team.findMany({
			where: {
				members: {
					some: {},
				},
			},
			select: {
				_count: { select: { members: true } },
			},
		});

		const verifiedTeams = teams.filter((team) => team._count.members === 5).length;
		const notFullTeams = teams.filter((team) => team._count.members < 5).length;

		return NextResponse.json({ verifiedTeams, notFullTeams });
	} catch (error) {
		console.error('Error fetching team stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
