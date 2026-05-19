export async function fetchTournament(tournamentId: number): Promise<any | null> {
	const base = process.env.NEXTAUTH_URL ?? '';
	const url = base ? `${base}/api/tournaments/${tournamentId}` : `/api/tournaments/${tournamentId}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`Error fetching tournament: ${response.statusText}`);
	}

	const data = await response.json();
	return data.tournament ?? null;
}
