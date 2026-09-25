import { z } from 'zod';
import { Game } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GAMES } from '@/lib/games';

const bodySchema = z.object({
	games: z.array(z.enum(GAMES)).min(1, 'Pick at least one game').max(GAMES.length),
});

/**
 * Onboarding "which games do you play" step: `{ games: ("CS2" | "LOL")[] }`, at least one.
 * Saved to User.games, which the wizard then reads back (GET .../status) to decide whether to
 * show the Steam and/or Riot ID steps next.
 */
export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid games' }, { status: 400 });

	try {
		const games = [...new Set(parsed.data.games)] as Game[];
		const user = await db.user.update({ where: { id: session.user.id }, data: { games }, select: { games: true } });
		return NextResponse.json({ games: user.games }, { status: 200 });
	} catch (error) {
		console.error('Error saving onboarding games:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
