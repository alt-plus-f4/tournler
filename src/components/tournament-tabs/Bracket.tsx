'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { BracketSlot, MatchStatus, TournamentDetail } from './types';

interface BracketMatchTeam {
	id: number;
	name: string;
}

interface BracketMatch {
	id: number;
	round: number;
	position: number;
	bracketSlot: BracketSlot;
	status: MatchStatus;
	teamA: BracketMatchTeam | null;
	teamB: BracketMatchTeam | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: BracketMatchTeam | null;
}

interface Standing {
	teamId: number;
	wins: number;
	losses: number;
	played: number;
	team: { id: number; name: string; logo: string | null } | null;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
	return res.json();
};

const LABEL = 'text-xs font-bold uppercase tracking-widest text-muted-foreground';

function MatchCard({ match }: { match: BracketMatch }) {
	const done = match.status === 'COMPLETED' && !!match.winner;
	const label = `${match.teamA?.name ?? 'TBD'} vs ${match.teamB?.name ?? 'TBD'}${done ? `, won by ${match.winner!.name}` : match.status === 'LIVE' ? ', live' : ''}`;

	return (
		<Link
			href={`/matches/${match.id}`}
			aria-label={label}
			className={cn(
				'block w-full rounded-md border bg-neutral-950 transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
				match.status === 'LIVE' ? 'border-signal-live/60' : match.status === 'PAUSED' ? 'border-signal-hold/60' : 'border-border',
			)}
		>
			{([match.teamA, match.teamB] as const).map((team, i) => {
				const score = i === 0 ? match.scoreTeamA : match.scoreTeamB;
				const isWinner = done && !!team && match.winner!.id === team.id;
				const isLoser = done && !!team && !isWinner;
				return (
					<div key={i} className={cn('flex items-center justify-between gap-3 px-3 py-2 text-sm', i === 0 && 'border-b border-border', isWinner ? 'font-black text-white' : isLoser ? 'text-muted-foreground' : team ? 'font-bold text-white' : 'text-muted-foreground')}>
						<span className='min-w-0 truncate uppercase tracking-wide'>{team?.name ?? 'TBD'}</span>
						<span className='shrink-0 font-mono tabular-nums'>{score ?? '–'}</span>
					</div>
				);
			})}
		</Link>
	);
}

function roundName(round: number, totalRounds: number, slot: BracketSlot, isSingleElim: boolean) {
	if (slot === 'WINNERS' && isSingleElim) {
		const fromEnd = totalRounds - round;
		if (fromEnd === 0) return 'Final';
		if (fromEnd === 1) return 'Semifinals';
		if (fromEnd === 2) return 'Quarterfinals';
	}
	return `Round ${round}`;
}

function BracketSection({ matches, title, isSingleElim }: { matches: BracketMatch[]; title: string; isSingleElim: boolean }) {
	const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
	if (rounds.length === 0) return null;
	const totalRounds = rounds[rounds.length - 1];

	return (
		<section className='mb-10'>
			<h2 className={cn(LABEL, 'mb-4')}>{title}</h2>
			{/* Rounds share the available width; below ~15rem per round the row scrolls instead of squeezing names. */}
			<div className='-mx-1 overflow-x-auto px-1 pb-2'>
				<ol className='grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-6'>
					{rounds.map((round) => {
						const roundMatches = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
						return (
							<li key={round} className='flex flex-col'>
								<h3 className={cn(LABEL, 'mb-3')}>{roundName(round, totalRounds, roundMatches[0].bracketSlot, isSingleElim)}</h3>
								<ul className='flex flex-1 flex-col justify-around gap-4'>
									{roundMatches.map((m) => (
										<li key={m.id}>
											<MatchCard match={m} />
										</li>
									))}
								</ul>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}

function StandingsTable({ tournamentId }: { tournamentId: number }) {
	const { data, error, isLoading } = useSWR(`/api/tournaments/${tournamentId}/standings`, fetcher, { refreshInterval: 5000 });
	const standings: Standing[] = data?.standings ?? [];

	if (isLoading) return <p className='py-8 text-center text-muted-foreground'>Loading standings…</p>;
	if (error) return <p className='py-8 text-center text-muted-foreground'>Standings failed to load.</p>;
	if (standings.length === 0) return <p className='py-8 text-center text-muted-foreground'>No results reported yet.</p>;

	return (
		<div className='overflow-x-auto'>
			<table className='w-full border-collapse text-left text-sm'>
				<caption className='sr-only'>Round-robin standings</caption>
				<thead>
					<tr className='border-b border-border text-xs uppercase tracking-wide text-muted-foreground'>
						<th scope='col' className='px-3 py-2'>#</th>
						<th scope='col' className='px-3 py-2'>Team</th>
						<th scope='col' className='px-3 py-2 text-right'>Played</th>
						<th scope='col' className='px-3 py-2 text-right'>Wins</th>
						<th scope='col' className='px-3 py-2 text-right'>Losses</th>
					</tr>
				</thead>
				<tbody>
					{standings.map((s, i) => (
						<tr key={s.teamId} className='border-b border-border'>
							<td className='px-3 py-2 font-mono tabular-nums text-muted-foreground'>{i + 1}</td>
							<td className='px-3 py-2 font-bold uppercase tracking-wide text-white'>{s.team?.name ?? `Team ${s.teamId}`}</td>
							<td className='px-3 py-2 text-right font-mono tabular-nums text-neutral-300'>{s.played}</td>
							<td className='px-3 py-2 text-right font-mono tabular-nums text-white'>{s.wins}</td>
							<td className='px-3 py-2 text-right font-mono tabular-nums text-neutral-300'>{s.losses}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Renders the real bracket (or round-robin standings) from actual match data, refreshed every 5s
 * so results the game server reports show up without a reload.
 */
export default function Bracket({ tournament }: { tournament: TournamentDetail }) {
	const isUpcoming = tournament.status === 'UPCOMING';
	const isRoundRobin = tournament.format === 'ROUND_ROBIN';
	const { data, error, isLoading } = useSWR(!isUpcoming && !isRoundRobin ? `/api/tournaments/${tournament.id}/matches` : null, fetcher, { refreshInterval: 5000 });
	const matches: BracketMatch[] = data?.matches ?? [];

	if (isUpcoming) {
		return <p className='p-8 text-center text-muted-foreground'>The bracket is generated from the registered teams when the tournament starts.</p>;
	}

	if (isRoundRobin) {
		return (
			<div className='p-4 sm:p-6'>
				<StandingsTable tournamentId={tournament.id} />
			</div>
		);
	}

	if (isLoading) return <p className='py-8 text-center text-muted-foreground'>Loading bracket…</p>;
	if (error) return <p className='py-8 text-center text-muted-foreground'>The bracket failed to load.</p>;
	if (matches.length === 0) return <p className='p-8 text-center text-muted-foreground'>No bracket matches yet.</p>;

	const isSingleElim = tournament.format === 'SINGLE_ELIMINATION';
	const isDoubleElim = tournament.format === 'DOUBLE_ELIMINATION';
	const bySlot = (slot: BracketSlot) => matches.filter((m) => m.bracketSlot === slot).sort((a, b) => a.round - b.round || a.position - b.position);
	const grandFinal = bySlot('GRAND_FINAL');
	const thirdPlace = bySlot('THIRD_PLACE');

	return (
		<div className='p-4 sm:p-6'>
			<BracketSection matches={bySlot('WINNERS')} title={isDoubleElim ? 'Winners bracket' : 'Bracket'} isSingleElim={isSingleElim} />
			{isDoubleElim && <BracketSection matches={bySlot('LOSERS')} title='Losers bracket' isSingleElim={false} />}
			{(grandFinal.length > 0 || thirdPlace.length > 0) && (
				<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
					{grandFinal.length > 0 && (
						<section>
							<h2 className={cn(LABEL, 'mb-3')}>Grand final</h2>
							<ul className='space-y-4'>
								{grandFinal.map((m) => (
									<li key={m.id}>
										<MatchCard match={m} />
									</li>
								))}
							</ul>
						</section>
					)}
					{thirdPlace.length > 0 && (
						<section>
							<h2 className={cn(LABEL, 'mb-3')}>3rd place</h2>
							<ul className='space-y-4'>
								{thirdPlace.map((m) => (
									<li key={m.id}>
										<MatchCard match={m} />
									</li>
								))}
							</ul>
						</section>
					)}
				</div>
			)}
		</div>
	);
}
