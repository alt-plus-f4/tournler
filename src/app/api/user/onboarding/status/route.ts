import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	const session = await getAuthSession();

	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		include: { discord: true, steam: true },
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	// console.log(user);

	const hasName = !!user.name;
	const hasImage = !!user.image;
	const hasLinkedDiscord = !!user.discord;
	const hasLinkedSteam = !!user.steam;

	return NextResponse.json(
		{
			hasName,
			hasImage,
			hasLinkedDiscord,
			hasLinkedSteam,
		},
		{ status: 200 }
	);
}
