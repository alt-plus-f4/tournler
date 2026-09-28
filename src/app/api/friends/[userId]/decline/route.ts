import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

/** POST /api/friends/[userId]/decline — decline a pending request sent by userId to the caller. */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { userId } = await params;

		await db.friendRequest.deleteMany({ where: { senderId: userId, receiverId: session.user.id } });

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error('Error declining friend request:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
