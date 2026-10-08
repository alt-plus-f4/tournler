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

export interface FriendListEntry {
	id: string;
	name: string | null;
	image: string | null;
}

/** userId's friends, most recently befriended first. Public — same visibility as the friend count already shown on any profile. */
export async function getFriendsList(userId: string, limit = 24): Promise<FriendListEntry[]> {
	const rows = await db.friendship.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: limit,
		select: { friend: { select: { id: true, name: true, image: true } } },
	});
	return rows.map((r) => r.friend);
}
