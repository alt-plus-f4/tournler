export async function fetchUsersRequestedToJoin(teamId: number) {
	try {
		const res = await fetch(
			`${process.env.NEXTAUTH_URL}/api/teams/${teamId}/invites`
		);
		if (!res.ok) {
			throw new Error('Failed to fetch users requested to join');
		}
		const data = await res.json();
		return data;
	} catch (error) {
		console.error('Error fetching users requested to join:', error);
		return [];
	}
}


