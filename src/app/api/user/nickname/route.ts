import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	const session = await getAuthSession();

	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await db.user.findUnique({
		where: { email: session?.user?.email || '' },
		select: {
			nickname: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	const hasNickname = !!user.nickname;
	return NextResponse.json({ hasNickname }, { status: 200 });
}

export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const user = await db.user.findUnique({
		where: { email: session?.user?.email || '' },
	});

	if (!user)
		return NextResponse.json({ error: 'User not found' }, { status: 404 });

	const { nickname } = await request.json();

	if (!nickname || typeof nickname !== 'string')
		return NextResponse.json(
			{ error: 'Invalid nickname' },
			{ status: 400 }
		);

	await db.user.update({
		where: { email: session.user.email || '' },
		data: { nickname },
	});

	return NextResponse.json(
		{ message: 'Nickname updated successfully' },
		{ status: 200 }
	);
}
