'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FeaturedTournament } from '@/components/FeaturedTournament';
import { TournamentRow } from '@/components/TournamentRow';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { ReducedTournament } from '@/types/types';

type TournamentView = 'active' | 'completed';

const VIEWS: { value: TournamentView; label: string; empty: string }[] = [
	{ value: 'active', label: 'Upcoming & live', empty: 'No upcoming or live tournaments right now.' },
	{ value: 'completed', label: 'Completed', empty: 'No completed tournaments yet.' },
];

export function TournamentsSkeleton() {
	return (
		<div role='status' aria-label='Loading tournaments' className='space-y-8'>
			<Skeleton className='h-64 w-full rounded-md bg-neutral-900' />
			<div className='grid gap-4 sm:grid-cols-3'>
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className='h-[156px] rounded-md bg-neutral-900' />
				))}
			</div>
		</div>
	);
}

export function TournamentsBrowser() {
	const [view, setView] = useState<TournamentView>('active');
	const [tournaments, setTournaments] = useState<ReducedTournament[] | null>(null);
	const [error, setError] = useState(false);
	const [isSwitching, setIsSwitching] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const cacheRef = useRef<Partial<Record<TournamentView, ReducedTournament[]>>>({});

	useEffect(() => {
		let cancelled = false;
		const cached = cacheRef.current[view];
		if (cached) {
			setError(false);
			setTournaments(cached);
			return;
		}

		setIsSwitching(true);
		setError(false);
		fetch(`/api/tournaments?status=${view}`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<ReducedTournament[]>;
			})
			.then((data) => {
				if (cancelled) return;
				cacheRef.current[view] = data;
				setTournaments(data);
			})
			.catch((err) => {
				console.error(err);
				if (!cancelled) setError(true);
			})
			.finally(() => {
				if (!cancelled) setIsSwitching(false);
			});

		return () => {
			cancelled = true;
		};
	}, [view, reloadKey]);

	const current = VIEWS.find((v) => v.value === view)!;

	return (
		<div>
			<div role='group' aria-label='Filter tournaments' className='mb-8 inline-flex rounded-md border border-border p-1'>
				{VIEWS.map((v) => (
					<Button
						key={v.value}
						size='sm'
						variant={view === v.value ? 'default' : 'ghost'}
						aria-pressed={view === v.value}
						onClick={() => setView(v.value)}
						className='rounded-sm'
					>
						{v.label}
					</Button>
				))}
			</div>

			{error ? (
				<div role='alert' className='rounded-md border border-signal-live/30 p-6 text-center'>
					<p className='text-sm text-white'>Tournaments failed to load.</p>
					<Button variant='outline' size='sm' className='mt-4' onClick={() => setReloadKey((k) => k + 1)}>
						Try again
					</Button>
				</div>
			) : tournaments === null ? (
				<TournamentsSkeleton />
			) : tournaments.length === 0 ? (
				<p className='rounded-md border border-border p-8 text-center text-muted-foreground'>{current.empty}</p>
			) : (
				<div aria-busy={isSwitching} className={`transition-opacity duration-200 ${isSwitching ? 'opacity-60' : 'opacity-100'}`}>
					<FeaturedTournament {...tournaments[0]} />

					{tournaments.length > 1 && (
						<div className='mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:justify-between'>
							{tournaments.slice(1, 4).map((tournament) => (
								<UpcomingTournament key={tournament.id} {...tournament} />
							))}
						</div>
					)}

					{tournaments.length > 4 && (
						<div className='mt-12 space-y-2'>
							{tournaments.slice(4).map((tournament) => (
								<TournamentRow key={tournament.id} {...tournament} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
