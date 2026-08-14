import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await db.user.findUnique({
			where: { email: session?.user?.email || '' },
			select: { discord: { select: { id: true } } },
		});

		if (!user)
			return NextResponse.json({ error: 'User not found' }, { status: 404 });

		const hasLinkedDiscord = !!user.discord;

		return NextResponse.json({ hasLinkedDiscord }, { status: 200 });
	} catch (error) {
		console.error('Error fetching Discord link status:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const user = await db.user.findUnique({
			where: { email: session?.user?.email || '' },
			select: { id: true },
		});

		if (!user)
			return NextResponse.json({ error: 'User not found' }, { status: 404 });

		const { discord } = await request.json();

		if (!discord || typeof discord !== 'string')
			return NextResponse.json(
				{ error: 'Invalid Discord ID' },
				{ status: 400 }
			);

		await db.discordAccount.upsert({
			where: { userId: user.id },
			update: {
				discordId: discord,
			},
			create: {
				userId: user.id,
				discordId: discord,
				accessToken: discord,
			},
		});

		return NextResponse.json(
			{ message: 'Discord account linked successfully' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error linking Discord account:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
