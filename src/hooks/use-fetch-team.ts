'use client';

import { ExtendedCs2Team } from '@/lib/models/team-model';
import { useState, useEffect } from 'react';

interface Team extends ExtendedCs2Team {
	isUserTeamCaptain: boolean;
	isUserMember: boolean;
}

export default function useFetchTeam(teamId: number) {
	const [team, setTeam] = useState<Team | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchTeam() {
			try {
				const res = await fetch(`/api/cs2/teams/${teamId}`);
				if (res.ok) {
					const data = await res.json();
					setTeam(data);
				}
			} catch (error) {
				console.error('Error fetching team:', error);
			} finally {
				setLoading(false);
			}
		}
		fetchTeam();
	}, [teamId]);

	return { team, loading };
}
