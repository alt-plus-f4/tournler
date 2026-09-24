'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { TournamentList, TOURNAMENT_VIEWS as VIEWS, type ListedTournament, type TournamentView } from './TournamentList';

/**
 * Server-first version of the public tournaments browser. The default "Upcoming & live" view
 * arrives as server-rendered `active` (streamed from the page, no client fetch); only the
 * "Completed" view is fetched on demand, then cached for the visit.
 */
export function TournamentsBrowser({ active }: { active: ReactNode }) {
	const [view, setView] = useState<TournamentView>('active');
	const [completed, setCompleted] = useState<ListedTournament[] | null>(null);
	const [error, setError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const loadedRef = useRef(false);
	const switching = view === 'completed' && completed === null && !error;

	useEffect(() => {
		if (view !== 'completed' || loadedRef.current) return;
		let cancelled = false;
		setError(false);
		fetch('/api/tournaments?status=completed')
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<ListedTournament[]>;
			})
			.then((data) => {
				if (cancelled) return;
				loadedRef.current = true;
				setCompleted(data);
			})
			.catch((err) => {
				console.error(err);
				if (!cancelled) setError(true);
			});

		return () => {
			cancelled = true;
		};
	}, [view, reloadKey]);

	return (
		<div>
			<div role='group' aria-label='Filter tournaments' className='mb-8 inline-flex rounded-md border border-border p-1'>
				{VIEWS.map((v) => (
					<Button key={v.value} size='sm' variant={view === v.value ? 'default' : 'ghost'} aria-pressed={view === v.value} onClick={() => setView(v.value)} className='rounded-sm'>
						{v.label}
					</Button>
				))}
			</div>

			{/* Kept mounted (just hidden) so switching back doesn't re-stream the server list. While the
			    completed list loads the first time, the current list stays up dimmed, as before. */}
			<div hidden={view !== 'active' && !switching} aria-busy={switching} className={`transition-opacity duration-200 ${switching ? 'opacity-60' : 'opacity-100'}`}>
				{active}
			</div>

			{view === 'completed' &&
				!switching &&
				(error ? (
					<div role='alert' className='rounded-md border border-signal-live/30 p-6 text-center'>
						<p className='text-sm text-white'>Tournaments failed to load.</p>
						<Button variant='outline' size='sm' className='mt-4' onClick={() => setReloadKey((k) => k + 1)}>
							Try again
						</Button>
					</div>
				) : (
					completed && <TournamentList tournaments={completed} empty={VIEWS[1].empty} />
				))}
		</div>
	);
}
