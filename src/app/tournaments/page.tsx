'use client';

import { Button } from '@/components/ui/button';
import { FeaturedTournament } from '@/components/FeaturedTournament';
import { TournamentRow } from '@/components/TournamentRow';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { useEffect, useState } from 'react';
import { ReducedTournament } from '@/types/types';
import Loading from './loading';

type TournamentView = 'active' | 'completed';

export default function Page() {
	const [tournaments, setTournaments] = useState<ReducedTournament[]>([]);
	const [view, setView] = useState<TournamentView>('active');
	const [isLoading, setIsLoading] = useState(true);
	const [isSwitching, setIsSwitching] = useState(false);
	const [cache, setCache] = useState<Record<TournamentView, ReducedTournament[]>>({
		active: [],
		completed: [],
	});

	useEffect(() => {
		async function fetchTournaments(status: TournamentView) {
			if (cache[status].length > 0) {
				setTournaments(cache[status]);
				setIsLoading(false);
				return;
			}

			if (isLoading) {
				setIsLoading(true);
			} else {
				setIsSwitching(true);
			}

			try {
				const response = await fetch(`/api/tournaments?status=${status}`);
				const data: ReducedTournament[] = await response.json();

				setTournaments(data);
				setCache((prev) => ({
					...prev,
					[status]: data,
				}));
			} catch (error) {
				console.error(error);
			} finally {
				setIsLoading(false);
				setIsSwitching(false);
			}
		}
		fetchTournaments(view);
	}, [view, cache, isLoading]);

	if (isLoading) return <Loading />;

	return (
		<div className='w-[78%] mx-auto my-8'>
			<div className={`transition-opacity duration-300 ${isSwitching ? 'opacity-70' : 'opacity-100'}`}>
				{tournaments[0] && <FeaturedTournament {...tournaments[0]} />}

				<div className='mt-8 flex flex-col sm:flex-row gap-4 sm:justify-around items-center'>{tournaments[1] && tournaments.slice(1, 4).map((tournament, index) => <UpcomingTournament key={tournament.id || index} {...tournament} />)}</div>
			</div>

			<div className='flex flex-col sm:flex-row justify-center gap-4 mt-8'>
				<Button variant={view === 'active' ? 'default' : 'outline'} className='px-1 py-0 text-xs md:text-sm md:px-4 md:py-2' onClick={() => setView('active')} disabled={isSwitching}>
					Upcoming & Live
				</Button>
				<Button variant={view === 'completed' ? 'default' : 'outline'} className='px-1 py-0 text-xs md:text-sm md:px-4 md:py-2' onClick={() => setView('completed')} disabled={isSwitching}>
					Completed
				</Button>
			</div>

			<div className={`mt-12 space-y-2 transition-all duration-300 ${isSwitching ? 'translate-y-1' : 'translate-y-0'}`}>
				{tournaments.slice(4).map((tournament) => (
					<TournamentRow key={tournament.id} {...tournament} />
				))}
			</div>
		</div>
	);
}
