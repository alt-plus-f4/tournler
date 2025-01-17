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

    const tournamentsCount = await db.cs2Tournament.groupBy({
        by: ['status'],
        _count: {
            status: true,
        },
        where: {
            status: {
                in: [0, 1],
            },
        },
    });

    const result = {
        ended: tournamentsCount.find(t => t.status === 1)?._count.status || 0,
        upcoming: tournamentsCount.find(t => t.status === 0)?._count.status || 0,
    };

    return NextResponse.json(result);
}
