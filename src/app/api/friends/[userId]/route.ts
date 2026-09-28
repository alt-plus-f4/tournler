import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { notifyFriendRequest } from '@/lib/convex-server';

/** POST /api/friends/[userId] — send a friend request to userId. */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { userId } = await params;
		if (userId === session.user.id) return NextResponse.json({ error: 'You can’t friend yourself' }, { status: 400 });

		const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
		if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

		const [alreadyFriends, existingRequest] = await Promise.all([
			db.friendship.findUnique({ where: { userId_friendId: { userId: session.user.id, friendId: userId } } }),
			db.friendRequest.findFirst({
				where: {
					OR: [
						{ senderId: session.user.id, receiverId: userId },
						{ senderId: userId, receiverId: session.user.id },
					],
				},
			}),
		]);
		if (alreadyFriends) return NextResponse.json({ error: 'You’re already friends' }, { status: 400 });
		if (existingRequest) return NextResponse.json({ error: 'A friend request already exists between you two' }, { status: 400 });

		const friendRequest = await db.friendRequest.create({ data: { senderId: session.user.id, receiverId: userId } });

		await notifyFriendRequest(userId, session.user.id, session.user.name ?? 'Someone').catch((error) => console.error('Failed to send friend request notification:', error));

		return NextResponse.json({ friendRequest }, { status: 200 });
	} catch (error) {
		console.error('Error sending friend request:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** DELETE /api/friends/[userId] — unfriend userId, or cancel a pending request the caller sent to them. */
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { userId } = await params;

		await db.$transaction([
			db.friendship.deleteMany({
				where: {
					OR: [
						{ userId: session.user.id, friendId: userId },
						{ userId, friendId: session.user.id },
					],
				},
			}),
			db.friendRequest.deleteMany({ where: { senderId: session.user.id, receiverId: userId } }),
		]);

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error('Error removing friend:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
