/** Client fetch helpers for the friend-request/friendship API. Each throws the server's message on failure. */

async function post(path: string) {
	const response = await fetch(path, { method: 'POST' });
	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new Error(data.error || 'Something went wrong');
	}
}

/** Sends a friend request to userId. */
export function sendFriendRequest(userId: string) {
	return post(`/api/friends/${userId}`);
}

/** Accepts a pending request userId sent to the caller. */
export function acceptFriendRequest(userId: string) {
	return post(`/api/friends/${userId}/accept`);
}

/** Declines a pending request userId sent to the caller. */
export function declineFriendRequest(userId: string) {
	return post(`/api/friends/${userId}/decline`);
}

/** Unfriends userId, or cancels a pending request the caller sent to them. */
export async function removeFriend(userId: string) {
	const response = await fetch(`/api/friends/${userId}`, { method: 'DELETE' });
	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new Error(data.error || 'Something went wrong');
	}
}
