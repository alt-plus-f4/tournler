'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Cs2Tournament } from '@/types/types';

interface BracketMatchTeam {
	id: number;
	name: string;
}

interface BracketMatch {
	id: number;
	round: number;
	position: number;
	bracketSlot: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
	status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function MatchCard({ match }: { match: BracketMatch }) {
	return (
		<Link href={`/matches/${match.id}`} className={`block w-56 shrink-0 rounded-md border bg-neutral-950 hover:border-neutral-500 transition-colors ${match.status === 'LIVE' ? 'border-white' : 'border-neutral-800'}`}>
			{([match.teamA, match.teamB] as const).map((team, i) => {
				const score = i === 0 ? match.scoreTeamA : match.scoreTeamB;
				const isWinner = !!(match.winner && team && match.winner.id === team.id);
				return (
					<div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${i === 0 ? 'border-b border-neutral-800' : ''} ${isWinner ? 'bg-neutral-900 text-white font-bold' : 'text-neutral-400'}`}>
						<span className='truncate'>{team?.name ?? 'TBD'}</span>
						<span>{score ?? '-'}</span>
					</div>
				);
			})}
		</Link>
	);
}

function BracketSection({ matches, title }: { matches: BracketMatch[]; title: string }) {
	const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
	if (rounds.length === 0) return null;

	return (
		<div className='mb-12'>
			<h3 className='text-sm uppercase tracking-widest text-neutral-500 font-bold mb-4'>{title}</h3>
			<div className='flex gap-8 overflow-x-auto pb-4'>
				{rounds.map((round) => {
					const roundMatches = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
					return (
						<div key={round} className='flex flex-col justify-around gap-6'>
							<p className='text-xs text-neutral-500 uppercase tracking-wide text-center mb-2'>Round {round}</p>
							{roundMatches.map((m) => (
								<MatchCard key={m.id} match={m} />
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function StandingsTable({ tournamentId }: { tournamentId: number }) {
	const { data, isLoading } = useSWR(`/api/tournaments/${tournamentId}/standings`, fetcher, { refreshInterval: 5000 });
	const standings: Standing[] = data?.standings ?? [];

	if (isLoading) {
		return <p className='text-neutral-500 text-center py-8'>Loading standings...</p>;
	}

	return (
		<div className='overflow-x-auto'>
			<table className='w-full text-sm text-left border-collapse'>
				<thead>
					<tr className='text-neutral-500 uppercase text-xs tracking-wide border-b border-neutral-800'>
						<th className='py-2 px-3'>#</th>
						<th className='py-2 px-3'>Team</th>
						<th className='py-2 px-3'>Played</th>
						<th className='py-2 px-3'>Wins</th>
						<th className='py-2 px-3'>Losses</th>
					</tr>
				</thead>
				<tbody>
					{standings.map((s, i) => (
						<tr key={s.teamId} className='border-b border-neutral-900'>
							<td className='py-2 px-3 text-neutral-500'>{i + 1}</td>
							<td className='py-2 px-3 text-white font-medium'>{s.team?.name ?? `Team ${s.teamId}`}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.played}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.wins}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.losses}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface BracketProps {
	tournament: Cs2Tournament;
}

/**
 * Renders the real bracket tree (or round-robin standings) from actual match
 * data — replaces a previous version of this tab that synthesized a fake
 * bracket client-side from the team list and never reflected real results.
 */
export default function Bracket({ tournament }: BracketProps) {
	const { data, isLoading } = useSWR(tournament.status !== 'UPCOMING' ? `/api/tournaments/${tournament.id}/matches` : null, fetcher, { refreshInterval: 5000 });
	const matches: BracketMatch[] = data?.matches ?? [];

	if (tournament.status === 'UPCOMING') {
		return <div className='p-8 text-center text-neutral-500'>The bracket will be generated once the tournament starts.</div>;
	}

	if (tournament.format === 'ROUND_ROBIN') {
		return (
			<div className='p-6'>
				<StandingsTable tournamentId={tournament.id} />
			</div>
		);
	}

	if (isLoading) {
		return <p className='text-neutral-500 text-center py-8'>Loading bracket...</p>;
	}

	if (matches.length === 0) {
		return <div className='p-8 text-center text-neutral-500'>No bracket matches yet.</div>;
	}

	const winners = matches.filter((m) => m.bracketSlot === 'WINNERS');
	const losers = matches.filter((m) => m.bracketSlot === 'LOSERS');
	const grandFinal = matches.filter((m) => m.bracketSlot === 'GRAND_FINAL').sort((a, b) => a.round - b.round);

	return (
		<div className='p-6'>
			<BracketSection matches={winners} title='Winners Bracket' />
			{tournament.format === 'DOUBLE_ELIMINATION' && <BracketSection matches={losers} title='Losers Bracket' />}
			{grandFinal.length > 0 && (
				<div>
					<h3 className='text-sm uppercase tracking-widest text-neutral-500 font-bold mb-4'>Grand Final</h3>
					<div className='flex gap-8'>
						{grandFinal.map((m) => (
							<MatchCard key={m.id} match={m} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}
