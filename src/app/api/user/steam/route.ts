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
		include: {
			steam: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	const hasLinkedSteam = !!user.steam;

	return NextResponse.json({ hasLinkedSteam }, { status: 200 });
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

	const { steamId } = await request.json();

	if (!steamId || typeof steamId !== 'string')
		return NextResponse.json(
			{ error: 'Invalid Steam ID' },
			{ status: 400 }
		);

	await db.steamAccount.upsert({
		where: { userId: user.id },
		update: {
			steamId: steamId,
		},
		create: {
			userId: user.id,
			steamId: steamId,
		},
	});

	return NextResponse.json(
		{ message: 'Steam account linked successfully' },
		{ status: 200 }
	);
}
