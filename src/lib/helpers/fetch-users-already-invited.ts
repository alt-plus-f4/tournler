export async function fetchUsersAlreadyInvited(teamId: number) {
	try {
		const res = await fetch(
			`${process.env.NEXTAUTH_URL}/api/teams/${teamId}/invites`
		);
		if (!res.ok) {
			throw new Error('Failed to fetch users already invited');
		}
		const data = await res.json();
		return data;
	} catch (error) {
		console.error('Error fetching users already invited:', error);
		return [];
	}
}