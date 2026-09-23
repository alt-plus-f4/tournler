'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MatchStatusLabel } from './MatchStatusLabel';
import { TeamLogo } from './TeamLogo';
import { SLOT_LABEL, type BracketSlot, type MatchStatus, type TournamentDetail } from './types';

interface MatchTeam {
	id: number;
	name: string;
	logo?: string | null;
}

interface Match {
	id: number;
	teamA: MatchTeam | null;
	teamB: MatchTeam | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: { id: number; name: string } | null;
	matchDate: string;
	status: MatchStatus;
	bestOf: number | null;
	round: number;
	bracketSlot: BracketSlot;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch matches');
	return res.json();
};

function TeamSide({ team, score, isWinner, isLoser, side }: { team: MatchTeam | null; score: number | null; isWinner: boolean; isLoser: boolean; side: 'a' | 'b' }) {
	const tone = isWinner ? 'text-white font-black' : isLoser ? 'text-muted-foreground font-bold' : 'text-white font-bold';
	// Mobile: logo · name · score on one row per team. From sm: the two sides face off around "vs",
	// scores nearest the centre.
	const a = side === 'a';
	return (
		<div className={cn('flex min-w-0 flex-1 items-center gap-3', a ? 'sm:justify-end' : 'sm:justify-start')}>
			{team?.logo && <TeamLogo src={team.logo} name={team.name} className='sm:order-2' />}
			<span className={cn('min-w-0 flex-1 truncate text-sm uppercase tracking-wide sm:flex-none', a ? 'sm:order-1 sm:text-right' : 'sm:order-3', team ? tone : 'text-muted-foreground font-bold')}>{team?.name ?? 'TBD'}</span>
			<span className={cn('w-8 shrink-0 text-center font-mono text-2xl tabular-nums', a ? 'sm:order-3' : 'sm:order-1', tone)}>{score ?? '–'}</span>
		</div>
	);
}

export default function Matches({ tournament }: { tournament: TournamentDetail }) {
	const { data, error, isLoading } = useSWR<{ matches: Match[] }>(`/api/tournaments/${tournament.id}/matches`, fetcher, { refreshInterval: 5000 });
	const matches = data?.matches ?? [];

	if (isLoading) {
		return (
			<div role='status' aria-label='Loading matches' className='space-y-2 p-4'>
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className='h-20 w-full bg-neutral-900' />
				))}
			</div>
		);
	}

	if (error) {
		return <p className='p-8 text-center text-muted-foreground'>Matches failed to load. They refresh automatically; try reloading if this persists.</p>;
	}

	if (matches.length === 0) {
		return <p className='p-8 text-center text-muted-foreground'>{tournament.status === 'UPCOMING' ? 'Matches are created when the tournament starts.' : 'No matches yet.'}</p>;
	}

	return (
		<ol className='space-y-2 p-4'>
			{matches.map((match) => {
				const bestOf = match.bestOf ?? tournament.bestOf;
				const hasBothTeams = !!(match.teamA && match.teamB);
				const winnerId = match.status === 'COMPLETED' ? match.winner?.id : undefined;
				const aWon = winnerId !== undefined && winnerId === match.teamA?.id;
				const bWon = winnerId !== undefined && winnerId === match.teamB?.id;
				const date = new Date(match.matchDate);
				const stage = tournament.format === 'ROUND_ROBIN' ? `Round ${match.round}` : `${SLOT_LABEL[match.bracketSlot]} · Round ${match.round}`;

				return (
					<li key={match.id}>
						<Link
							href={`/matches/${match.id}`}
							className={cn(
								'block rounded-md border bg-neutral-950 p-4 transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
								match.status === 'LIVE' ? 'border-signal-live/60' : 'border-border',
							)}
						>
							<div className='mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
								<MatchStatusLabel status={match.status} hasBothTeams={hasBothTeams} />
								<span className='text-xs text-muted-foreground'>
									{stage}
									{bestOf ? <span> · BO{bestOf}</span> : null}
									{' · '}
									<time dateTime={match.matchDate} className='font-mono tabular-nums'>
										{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
									</time>
								</span>
							</div>
							<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6'>
								<TeamSide team={match.teamA} score={match.scoreTeamA} isWinner={aWon} isLoser={bWon} side='a' />
								<span aria-hidden className='hidden text-xs text-muted-foreground sm:block'>
									vs
								</span>
								<TeamSide team={match.teamB} score={match.scoreTeamB} isWinner={bWon} isLoser={aWon} side='b' />
							</div>
							{match.status === 'COMPLETED' && match.winner && <span className='sr-only'>Winner: {match.winner.name}</span>}
						</Link>
					</li>
				);
			})}
		</ol>
	);
}
