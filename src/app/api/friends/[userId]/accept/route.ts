import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { notifyInfo } from '@/lib/convex-server';

/** POST /api/friends/[userId]/accept — accept a pending request sent by userId to the caller. */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { userId } = await params;

		const incoming = await db.friendRequest.findUnique({ where: { senderId_receiverId: { senderId: userId, receiverId: session.user.id } } });
		if (!incoming) return NextResponse.json({ error: 'No pending request from this user' }, { status: 404 });

		await db.$transaction([
			db.friendRequest.delete({ where: { id: incoming.id } }),
			db.friendship.create({ data: { userId: session.user.id, friendId: userId } }),
			db.friendship.create({ data: { userId, friendId: session.user.id } }),
		]);

		await notifyInfo(userId, `${session.user.name ?? 'Someone'} accepted your friend request.`).catch((error) => console.error('Failed to send friend accept notification:', error));

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error('Error accepting friend request:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
