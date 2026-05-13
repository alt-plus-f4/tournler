'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cs2Tournament } from '@/types/types';
import { Trophy } from 'lucide-react';

interface Match {
	id: number;
	teamA: { id: number; name: string };
	teamB: { id: number; name: string };
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: { id: number; name: string } | null;
	matchDate: string;
}

interface MatchesProps {
	tournament: Cs2Tournament;
}

const Matches: React.FC<MatchesProps> = ({ tournament }) => {
	const [matches, setMatches] = useState<Match[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchMatches = async () => {
			try {
				const response = await fetch(`/api/tournaments/${tournament.id}/matches`);
				if (!response.ok) throw new Error('Failed to fetch matches');

				const data = await response.json();
				setMatches(data.matches || []);
			} catch (error) {
				console.error('Error fetching matches:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMatches();
	}, [tournament.id]);

	if (isLoading) {
		return (
			<div className='space-y-4 p-4'>
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className='h-24 w-full bg-gray-800' />
				))}
			</div>
		);
	}

	if (matches.length === 0) {
		return (
			<div className='p-8 text-center'>
				<p className='text-gray-400'>No matches scheduled yet</p>
			</div>
		);
	}

	return (
		<div className='p-4 space-y-4'>
			{matches.map((match) => (
				<Link key={match.id} href={`/matches/${match.id}`}>
					<Card className='bg-gray-800 border-gray-700 hover:border-gray-500 transition-colors cursor-pointer'>
						<CardContent className='p-4'>
							<div className='flex items-center justify-between'>
								{/* Team A */}
								<div className='flex-1 text-right pr-4'>
									<p className='font-semibold text-white'>{match.teamA.name}</p>
									{match.scoreTeamA !== null && <p className='text-2xl font-bold text-blue-400'>{match.scoreTeamA}</p>}
								</div>

								{/* Score/Status */}
								<div className='text-center px-4'>
									{match.winner ? (
										<Badge className='bg-yellow-600 gap-1'>
											<Trophy className='h-3 w-3' />
											{match.winner.name}
										</Badge>
									) : match.scoreTeamA !== null ? (
										<Badge variant='outline' className='border-green-500 text-green-400'>
											Live
										</Badge>
									) : (
										<Badge variant='outline' className='text-gray-400'>
											Upcoming
										</Badge>
									)}

									<p className='text-xs text-gray-400 mt-2'>{new Date(match.matchDate).toLocaleDateString()}</p>
								</div>

								{/* Team B */}
								<div className='flex-1 text-left pl-4'>
									<p className='font-semibold text-white'>{match.teamB.name}</p>
									{match.scoreTeamB !== null && <p className='text-2xl font-bold text-red-400'>{match.scoreTeamB}</p>}
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	);
};

export default Matches;
