export async function removeMember(teamId : number, userId: string) {
    try {
		const response = await fetch(`/api/teams/${teamId}/`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
            body: JSON.stringify({ userId: userId })
		});

		if (!response.ok) {
			const errorData = await response.json();
			return { error: errorData.message };
		}

		return { success: true };
	} catch (error) {
		return { error: 'An unexpected error occurred' + error};
	}
}
