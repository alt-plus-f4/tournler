import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { TournamentStatus } from '@prisma/client';

export async function GET() {
	try {
		const session = await getAuthSession();
		const sessionUser = session?.user;

		if (!sessionUser) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!(await userHasPermission(sessionUser.id, 'tournaments:manage'))) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const [ended, upcoming] = await Promise.all([
			db.cs2Tournament.count({ where: { isSystem: false, status: TournamentStatus.COMPLETED } }),
			db.cs2Tournament.count({ where: { isSystem: false, status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } } }),
		]);

		return NextResponse.json({ ended, upcoming });
	} catch (error) {
		console.error('Error fetching tournament stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
