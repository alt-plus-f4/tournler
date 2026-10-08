import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

/**
 * GET /api/friends
 * The signed-in viewer's own friend ids — just enough for a client to mark a friend in a list
 * (e.g. the match-room roster) without round-tripping the full friend profiles.
 */
export async function GET() {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ friendIds: [] });

	const rows = await db.friendship.findMany({ where: { userId: session.user.id }, select: { friendId: true } });
	return NextResponse.json({ friendIds: rows.map((r) => r.friendId) });
}
