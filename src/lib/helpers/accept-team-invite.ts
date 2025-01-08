interface AcceptTeamInviteParams {
	userId: string;
	teamId: number;
}

export async function acceptTeamInvite(
	params: AcceptTeamInviteParams
): Promise<void> {
	const { userId, teamId } = params;
	try {
		const response = await fetch('/api/user/accept-invite', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ userId, teamId }),
		});

		const data = await response.json();
		if (response.ok) {
			console.log(data.message);
		} else {
			console.error(data.message);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}
