export default async function fetchUsers(teamId: number) {
	try {
		const res = await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${teamId}`);
		if (res.ok) {
			const data = await res.json();
			return data.users;
		} else {
			console.error('Failed to fetch users:', res.statusText);
			return null;
		}
	} catch (error) {
		console.error('Error fetching users:', error);
		return null;
	}
}