'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Check, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/hooks/use-toast';
import { RoomPanel } from './room-ui';

interface PredictionTeam {
	id: number;
	name: string;
}

interface PredictionState {
	enabled: boolean;
	locked: boolean;
	pick: number | null;
	counts: { teamA: number; teamB: number };
}

interface MatchPredictionProps {
	matchId: number;
	teamA: PredictionTeam;
	teamB: PredictionTeam;
	status: string;
	winnerId: number | null;
}

const fetcher = async (url: string): Promise<PredictionState> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
	return res.json();
};

/** Crowd prediction for one match: pick a winner until it goes live, then see how the crowd and you did. */
export function MatchPrediction({ matchId, teamA, teamB, status, winnerId }: MatchPredictionProps) {
	const { toast } = useToast();
	const [isSaving, setIsSaving] = useState(false);
	const { data, mutate } = useSWR(`/api/matches/${matchId}/prediction`, fetcher, { refreshInterval: status === 'COMPLETED' ? 0 : 15000 });

	if (!data || !data.enabled) return null;

	const completed = status === 'COMPLETED';
	const locked = data.locked || status !== 'SCHEDULED';
	const total = data.counts.teamA + data.counts.teamB;
	const pctA = total === 0 ? 50 : Math.round((data.counts.teamA / total) * 100);
	const pctB = total === 0 ? 50 : 100 - pctA;

	async function choose(teamId: number) {
		if (locked || isSaving) return;
		const removing = data?.pick === teamId;
		setIsSaving(true);
		try {
			const res = await fetch(`/api/matches/${matchId}/prediction`, {
				method: removing ? 'DELETE' : 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: removing ? undefined : JSON.stringify({ teamId }),
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) throw new Error(body?.error || 'Your pick was not saved.');
			await mutate();
		} catch (error) {
			toast({ variant: 'destructive', title: 'Prediction not saved', description: error instanceof Error ? error.message : 'Try again in a moment.' });
			await mutate();
		} finally {
			setIsSaving(false);
		}
	}

	const teams = [
		{ team: teamA, count: data.counts.teamA, pct: pctA },
		{ team: teamB, count: data.counts.teamB, pct: pctB },
	];

	return (
		<RoomPanel label='Predict the winner' bodyClassName='space-y-3'>
			<div className='grid grid-cols-2 gap-2'>
				{teams.map(({ team, count, pct }) => {
					const picked = data.pick === team.id;
					const won = completed && winnerId === team.id;
					return (
						<button
							key={team.id}
							type='button'
							onClick={() => choose(team.id)}
							disabled={locked || isSaving}
							aria-pressed={picked}
							className={cn(
								'flex min-w-0 flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
								picked ? 'border-white bg-white/10' : 'border-border bg-card',
								!locked && !picked && 'hover:border-neutral-500 hover:bg-white/5',
								completed && !won && 'opacity-60',
							)}
						>
							<span className='flex w-full items-center gap-1.5 text-sm font-bold text-white'>
								<span className='truncate'>{team.name}</span>
								{picked && <Check aria-hidden className='h-3.5 w-3.5 shrink-0' />}
							</span>
							<span className='font-mono text-xs tabular-nums text-muted-foreground'>
								{pct}% · {count} {count === 1 ? 'pick' : 'picks'}
							</span>
						</button>
					);
				})}
			</div>

			<div className='flex h-1.5 overflow-hidden rounded-full bg-neutral-800' role='img' aria-label={`Crowd split: ${teamA.name} ${pctA}%, ${teamB.name} ${pctB}%`}>
				<div className='bg-neutral-300 transition-[width] duration-300' style={{ width: `${pctA}%` }} />
				<div className='bg-neutral-600 transition-[width] duration-300' style={{ width: `${pctB}%` }} />
			</div>

			{completed ? (
				<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
					{data.pick === null ? (
						'You didn’t make a prediction for this match.'
					) : winnerId === data.pick ? (
						<>
							<Check aria-hidden className='h-3.5 w-3.5 text-signal-ready' /> You called it.
						</>
					) : (
						<>
							<X aria-hidden className='h-3.5 w-3.5 text-signal-live' /> Not this time.
						</>
					)}
				</p>
			) : locked ? (
				<p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
					<Lock aria-hidden className='h-3.5 w-3.5' /> Predictions are locked.
				</p>
			) : (
				<p className='text-xs text-muted-foreground'>Predictions lock when the match goes live. Tap your pick again to remove it.</p>
			)}
		</RoomPanel>
	);
}
