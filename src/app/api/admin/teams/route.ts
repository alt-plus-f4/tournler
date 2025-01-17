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

	const verifiedTeams = teams.filter(
		(team) => team.members.length === 5
	).length;
	const notFullTeams = teams.filter((team) => team.members.length < 5).length;

	return NextResponse.json({ verifiedTeams, notFullTeams });
}
