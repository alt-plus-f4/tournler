'use client';

import { useEffect, useState } from 'react';
import { FeaturedTournament } from '@/components/FeaturedTournament';
import { TournamentRow } from '@/components/TournamentRow';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Tournament {
	id: number;
	name: string;
	bannerUrl: string;
	logoUrl: string;
	startDate: string;
	prizePool: number;
	teams: [];
	teamCapacity: number;
	location: string;
}

function FeaturedTournamentSkeleton() {
	return (
		<div className='relative flex flex-col items-center rounded-lg shadow-lg overflow-hidden'>
			<Skeleton className='w-full h-56' />
			<div className='absolute inset-4 flex items-end justify-center'>
				<Skeleton className='h-8 w-[45%]' />
			</div>
		</div>
	);
}

function UpcomingTournamentSkeleton() {
	return (
		<div className='flex flex-col w-[30%] items-center border rounded shadow-lg'>
			<Skeleton className='w-full h-12' />
			<Skeleton className='h-4 w-40 mt-4' />
			<Skeleton className='h-2 w-32 mt-2' />
			<span className='border w-full mt-2'></span>
			<Skeleton className='h-4 w-[80%] my-2' />
		
		</div>
	);
}

function TournamentRowSkeleton() {
	return (
		<div className='flex items-center gap-4 p-4 border rounded justify-between'>
			<Skeleton className='w-8 h-8 rounded-full' />
			<Skeleton className='h-4 w-48' />
			<Skeleton className='h-4 w-24' />
			<Skeleton className='h-4 w-32' />
		</div>
	);
}

export default function Page() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [isUpcoming, setIsUpcoming] = useState(true);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchTournaments(status: number) {
			setLoading(true);
			try {
				const response = await fetch(
					`/api/tournaments?status=${status}`
				);
				const data: Tournament[] = await response.json();
				setTournaments(data);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		}
		fetchTournaments(isUpcoming ? 0 : 1);
	}, [isUpcoming]);

	const displayedTournaments = tournaments;

	return (
		<div className='w-[78%] mx-auto my-8'>
			{loading && (
				<FeaturedTournamentSkeleton />
			)}
			{displayedTournaments[0] && (
				<FeaturedTournament {...displayedTournaments[0]} />
			)}
			
			<div className='mt-8 flex flex-col sm:flex-row gap-4 sm:justify-around items-center'>
				{loading && (
					<>
						<UpcomingTournamentSkeleton />
						<UpcomingTournamentSkeleton />
						<UpcomingTournamentSkeleton />
					</>
				)}
				{displayedTournaments[1] && (
					<UpcomingTournament {...displayedTournaments[1]} />
				)}
				{displayedTournaments[2] && (
					<UpcomingTournament {...displayedTournaments[2]} />
				)}
				{displayedTournaments[3] && (
					<UpcomingTournament {...displayedTournaments[3]} />
				)}
			</div>
			<div className='flex justify-center gap-4 mt-8'>
				<Button
					variant={isUpcoming ? 'default' : 'outline'}
					className='px-4 py-2'
					onClick={() => setIsUpcoming(true)}
				>
					Upcoming Tournaments
				</Button>
				<Button
					variant={!isUpcoming ? 'default' : 'outline'}
					className='px-4 py-2'
					onClick={() => setIsUpcoming(false)}
				>
					Finished Tournaments
				</Button>
			</div>
			<div className='mt-12 space-y-2'>
				{loading && displayedTournaments.length === 0
					? [...Array(3)].map((_, i) => (
							<TournamentRowSkeleton key={i} />
						))
					: displayedTournaments
							.slice(3)
							.map((tournament) => (
								<TournamentRow
									key={tournament.id}
									{...tournament}
								/>
							))}
			</div>
		</div>
	);
}
