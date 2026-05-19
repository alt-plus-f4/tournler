export async function fetchUserTeam(userId: string) {
	try {
		const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
		const response = await fetch(`${baseUrl}/api/user/team?id=${encodeURIComponent(userId)}`);

		if (!response.ok) {
			return null;
		}

		const userTeam = await response.json();

		return userTeam;
	} catch (error) {
		return null;
	}
}
