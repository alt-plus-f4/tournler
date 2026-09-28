import { db } from '@/lib/db';

export type FriendStatus = 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE';

/** The viewer's relationship to profileUserId. Per-viewer, so this is never cached. */
export async function getFriendStatus(viewerId: string, profileUserId: string): Promise<FriendStatus> {
	if (viewerId === profileUserId) return 'NONE';

	const [friendship, request] = await Promise.all([
		db.friendship.findUnique({ where: { userId_friendId: { userId: viewerId, friendId: profileUserId } } }),
		db.friendRequest.findFirst({
			where: {
				OR: [
					{ senderId: viewerId, receiverId: profileUserId },
					{ senderId: profileUserId, receiverId: viewerId },
				],
			},
			select: { senderId: true },
		}),
	]);

	if (friendship) return 'FRIENDS';
	if (request) return request.senderId === viewerId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
	return 'NONE';
}

export function getFriendCount(userId: string): Promise<number> {
	return db.friendship.count({ where: { userId } });
}
