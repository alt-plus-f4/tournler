export default async function fetchInvitedPlayers(teamId: number) {
	const response = await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${teamId}/invites`);
	if (!response.ok) {
		throw new Error('Failed to fetch invited players');
	}

    return response.json();
}
