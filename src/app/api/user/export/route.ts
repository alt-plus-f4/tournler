import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { exportUserData } from '@/lib/account';

/** GDPR access/portability: downloads everything stored about the signed-in user as JSON. */
export async function GET() {
	const session = await getAuthSession();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await exportUserData(session.user.id);
	if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 });

	return new NextResponse(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="tournler-data-${session.user.id}.json"`,
			'Cache-Control': 'no-store',
		},
	});
}
