export async function fetchTournament(tournamentId: number): Promise<any> {
	const response = await fetch(
		`${process.env.NEXTAUTH_URL}/api/tournaments/${tournamentId}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);

	if (!response.ok) {
		throw new Error(`Error fetching tournament: ${response.statusText}`);
	}

	return response.json().then((data) => {
		return data.tournament;
	});
}
