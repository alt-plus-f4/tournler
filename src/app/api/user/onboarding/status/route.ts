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
			where: { id: session.user.id },
			select: { name: true, image: true, games: true, discord: { select: { id: true } }, steam: { select: { id: true } }, riot: { select: { id: true } } },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const hasName = !!user.name;
		const hasImage = !!user.image;
		const hasLinkedDiscord = !!user.discord;
		const hasLinkedSteam = !!user.steam;
		// Whether the Riot ID step has been attempted (linked or still pending verification), not
		// whether it's verified — mirrors hasLinkedSteam, which doesn't require FACEIT data either.
		const hasLinkedRiot = !!user.riot;

		return NextResponse.json(
			{
				hasName,
				hasImage,
				hasLinkedDiscord,
				hasLinkedSteam,
				hasLinkedRiot,
				games: user.games,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching onboarding status:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
