interface denyTeamInviteParams {
	userId: string;
	teamId: number;
}

export async function denyTeamInvite(
	params: denyTeamInviteParams
): Promise<void> {
	const { userId, teamId } = params;
	try {
		const response = await fetch('/api/user/deny-invite', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ userId, teamId }),
		});

		const data = await response.json();
		if (!response.ok) {
			console.error(data.message);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}
