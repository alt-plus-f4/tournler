/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cs2Tournament } from '@/types/types';
import { Trophy, Zap, BarChart3, Bell, Pin } from 'lucide-react';

interface Match {
	id: number;
	teamA: { id: number; name: string; logo?: string | null };
	teamB: { id: number; name: string; logo?: string | null };
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: { id: number; name: string } | null;
	matchDate: string;
	bestOf?: number;
}

interface MatchesProps {
	tournament: Cs2Tournament;
}

const Matches: React.FC<MatchesProps> = ({ tournament }) => {
	const [matches, setMatches] = useState<Match[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [followedMatches, setFollowedMatches] = useState<number[]>([]);
	const [pinnedMatches, setPinnedMatches] = useState<number[]>([]);

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
					<Skeleton key={i} className='h-24 w-full bg-neutral-900' />
				))}
			</div>
		);
	}

	if (matches.length === 0) {
		return (
			<div className='p-8 text-center'>
				<p className='text-neutral-500'>No matches scheduled yet</p>
			</div>
		);
	}

	return (
		<div className='p-3 space-y-2'>
			{matches.map((match) => (
				<Link key={match.id} href={`/matches/${match.id}`}>
					<div className='bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer rounded-lg overflow-hidden group'>
						<div className='p-6'>
							<div className='flex items-center justify-between gap-4'>
								{/* Left: Time and BO Format */}
								<div className='flex flex-col items-center justify-center min-w-[60px]'>
									<p className='text-lg font-black text-white'>{new Date(match.matchDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
									<p className='text-xs text-neutral-500 font-bold mt-1'>BO{match.bestOf || 3}</p>
								</div>

								{/* Team A */}
								<div className='flex-1 flex items-center gap-3 justify-end'>
									<div className='text-right'>
										<p className='font-bold text-white uppercase tracking-wide text-sm mb-2'>{match.teamA.name}</p>
										{match.scoreTeamA !== null && <p className='text-3xl font-black text-white'>{match.scoreTeamA}</p>}
									</div>
									{match.teamA.logo && <img src={match.teamA.logo} alt={match.teamA.name} loading='lazy' className='h-12 w-12 object-contain rounded-md border border-neutral-700 group-hover:border-neutral-500 transition-colors' />}
								</div>

								{/* Score/Status */}
								<div className='text-center px-6'>
									{match.winner ? (
										<Badge className='bg-white text-black gap-2 font-bold mb-3 px-3 py-1'>
											<Trophy className='h-4 w-4' />
											{match.winner.name}
										</Badge>
									) : match.scoreTeamA !== null ? (
										<Badge className='bg-black border-2 border-white text-white gap-2 font-bold mb-3 px-3 py-1 animate-pulse'>
											<Zap className='h-4 w-4' />
											LIVE
										</Badge>
									) : (
										<Badge className='bg-neutral-900 border border-neutral-700 text-neutral-400 font-bold mb-3 px-3 py-1'>UPCOMING</Badge>
									)}

									<p className='text-xs text-neutral-500 font-mono'>{new Date(match.matchDate).toLocaleDateString()}</p>
								</div>

								{/* Team B */}
								<div className='flex-1 flex items-center gap-3'>
									{match.teamB.logo && <img src={match.teamB.logo} alt={match.teamB.name} loading='lazy' className='h-12 w-12 object-contain rounded-md border border-neutral-700 group-hover:border-neutral-500 transition-colors' />}
									<div className='text-left'>
										<p className='font-bold text-white uppercase tracking-wide text-sm mb-2'>{match.teamB.name}</p>
										{match.scoreTeamB !== null && <p className='text-3xl font-black text-white'>{match.scoreTeamB}</p>}
									</div>
								</div>

								{/* Right: Action Icons */}
								<div className='flex items-center gap-3' onClick={(e) => e.preventDefault()}>
									<button className='p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white'>
										<BarChart3 className='w-5 h-5' />
									</button>
									<button
										className='p-2 rounded hover:bg-neutral-800 transition-colors'
										onClick={(e) => {
											e.preventDefault();
											setFollowedMatches((prev) => (prev.includes(match.id) ? prev.filter((id) => id !== match.id) : [...prev, match.id]));
										}}
									>
										<Bell className={`w-5 h-5 ${followedMatches.includes(match.id) ? 'fill-white text-white' : 'text-neutral-400'}`} />
									</button>
									<button
										className='p-2 rounded hover:bg-neutral-800 transition-colors'
										onClick={(e) => {
											e.preventDefault();
											setPinnedMatches((prev) => (prev.includes(match.id) ? prev.filter((id) => id !== match.id) : [...prev, match.id]));
										}}
									>
										<Pin className={`w-5 h-5 ${pinnedMatches.includes(match.id) ? 'fill-white text-white' : 'text-neutral-400'}`} />
									</button>
								</div>
							</div>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
};

export default Matches;
