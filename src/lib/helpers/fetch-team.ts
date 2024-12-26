export default async function fetchTeam(teamId: number) {
	if (isNaN(teamId)) {
		console.error('Fetch team: Invalid team ID');
		return null;
	}
	try {
		const res = await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${teamId}`);
		if (res.ok) {
			const data = await res.json();
			return data;
		} else {
			console.error('Failed to fetch team:', res.statusText);
			return null;
		}
	} catch (error) {
		console.error('Error fetching team:', error);
		return null;
	}
}