import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

export async function GET() {
	const session = await getAuthSession();
	const sessionUser = session?.user;

	if (!sessionUser) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!(await userHasPermission(session.user.id, 'teams:manage'))) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const teams = await db.cs2Team.findMany({
		where: {
			members: {
				some: {},
			},
		},
		include: {
			members: true,
		},
	});

	const verifiedTeams = teams.filter((team) => team.members.length === 5).length;
	const notFullTeams = teams.filter((team) => team.members.length < 5).length;

	return NextResponse.json({ verifiedTeams, notFullTeams });
}
