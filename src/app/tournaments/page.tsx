'use client';

import { Button } from '@/components/ui/button';
import { FeaturedTournament } from '@/components/FeaturedTournament';
import { TournamentRow } from '@/components/TournamentRow';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { useEffect, useState } from 'react';
import { ReducedTournament } from '@/types/types';
import Loading from './loading';

export default function Page() {
	const [tournaments, setTournaments] = useState<ReducedTournament[]>([]);
	const [isUpcoming, setIsUpcoming] = useState(true);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function fetchTournaments(status: number) {
			setIsLoading(true);
			try {
				const response = await fetch(
					`/api/tournaments?status=${status}`
				);
				const data: ReducedTournament[] = await response.json();

				setTournaments(data);
			} catch (error) {
				console.error(error);
			} finally {
				setIsLoading(false);
			}
		}
		fetchTournaments(isUpcoming ? 10 : 2);
	}, [isUpcoming]);

	if (isLoading) return <Loading />;

	return (
		<div className='w-[78%] mx-auto my-8'>
			{tournaments[0] && <FeaturedTournament {...tournaments[0]} />}

			<div className='mt-8 flex flex-col sm:flex-row gap-4 sm:justify-around items-center'>
				{tournaments[1] &&
					tournaments
						.slice(1, 4)
						.map((tournament, index) => (
							<UpcomingTournament
								key={tournament.id || index}
								{...tournament}
							/>
						))}
			</div>

			<div className='flex flex-col sm:flex-row justify-center gap-4 mt-8'>
				<Button
					variant={isUpcoming ? 'default' : 'outline'}
					className='px-1 py-0 text-xs md:text-sm md:px-4 md:py-2'
					onClick={() => setIsUpcoming(true)}
				>
					Upcoming Tournaments
				</Button>
				<Button
					variant={!isUpcoming ? 'default' : 'outline'}
					className='px-1 py-0 text-xs md:text-sm md:px-4 md:py-2'
					onClick={() => setIsUpcoming(false)}
				>
					Finished Tournaments
				</Button>
			</div>

			<div className='mt-12 space-y-2'>
				{tournaments.slice(4).map((tournament) => (
					<TournamentRow key={tournament.id} {...tournament} />
				))}
			</div>
		</div>
	);
}
