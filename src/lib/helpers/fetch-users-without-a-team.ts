export async function fetchUsersWithoutATeam(teamId: number) {
	try {
		const res = await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${teamId}`);
		if (!res.ok) {
			throw new Error('Failed to fetch users without a team');
		}
		const data = await res.json();
		return data;
	} catch (error) {
		console.error('Error fetching users without a team:', error);
		return [];
	}
}