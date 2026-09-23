'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/Pagination';
import CreateMatchDialog from '@/components/CreateMatchDialog';
import { Match } from '@/types/types';

type StatusFilter = 'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
	{ value: 'ALL', label: 'All' },
	{ value: 'LIVE', label: 'Live' },
	{ value: 'SCHEDULED', label: 'Upcoming' },
	{ value: 'COMPLETED', label: 'Completed' },
];

const MATCHES_PER_PAGE = 20;

function formatMatchTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Tomorrow';
	if (diffDays === -1) return 'Yesterday';
	const sameYear = date.getFullYear() === now.getFullYear();
	return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

function groupByDay(matches: Match[]) {
	const groups: { label: string; matches: Match[] }[] = [];
	for (const match of matches) {
		const label = dayLabel(match.matchDate);
		const last = groups[groups.length - 1];
		if (last && last.label === label) {
			last.matches.push(match);
		} else {
			groups.push({ label, matches: [match] });
		}
	}
	return groups;
}

function TeamLogo({ logo, name }: { logo?: string | null; name?: string }) {
	const [failed, setFailed] = useState(false);
	if (!logo || failed) {
		return <div aria-hidden className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-800 text-xs font-bold text-neutral-300'>{(name || '?').substring(0, 2).toUpperCase()}</div>;
	}
	return <Image src={logo} alt={name || ''} width={32} height={32} className='h-8 w-8 shrink-0 rounded bg-neutral-900 object-contain' onError={() => setFailed(true)} />;
}

function MatchRow({ match }: { match: Match }) {
	const isLive = match.status === 'LIVE';
	const isPaused = match.status === 'PAUSED';
	const isCompleted = match.status === 'COMPLETED';
	const isOpen = match.isPickup && match.status === 'SCHEDULED';
	// Completed with a tied/empty score = result set by hand; don't print "0 : 0" next to a winner.
	const tiedFinal = isCompleted && (match.scoreTeamA ?? 0) === (match.scoreTeamB ?? 0);
	const inProgress = isLive || isPaused || (isCompleted && !tiedFinal);
	// Pickups record the winning side (winnerSide); team matches record the winning team.
	const winnerSide = (match as Match & { winnerSide?: 'TEAM_A' | 'TEAM_B' | null }).winnerSide;
	const aWon = isCompleted && (match.isPickup ? winnerSide === 'TEAM_A' : !!match.winner && match.winner.id === match.teamA?.id);
	const bWon = isCompleted && (match.isPickup ? winnerSide === 'TEAM_B' : !!match.winner && match.winner.id === match.teamB?.id);
	// Shared result rule: winner white + bold, loser muted — identical for either side.
	const nameClass = (won: boolean, lost: boolean) => (lost ? 'text-muted-foreground' : won ? 'font-bold text-white' : 'font-medium text-white');
	const joinedCount = match.participants?.length ?? 0;

	return (
		<Link href={`/matches/${match.id}`} className='flex items-center gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:px-4'>
			<span className='hidden w-28 shrink-0 truncate text-xs text-muted-foreground sm:block'>{match.isPickup ? 'Pickup' : match.tournament.name}</span>

			<div className='flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3'>
				<div className='flex min-w-0 flex-1 items-center justify-end gap-2'>
					<span className={`truncate text-sm ${nameClass(aWon, bWon)}`}>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</span>
					{!match.isPickup && <TeamLogo logo={match.teamA?.logo} name={match.teamA?.name} />}
				</div>
				<div className='w-14 shrink-0 whitespace-nowrap text-center font-mono text-sm font-bold tabular-nums text-white'>{isOpen ? `${joinedCount}/10` : inProgress ? `${match.scoreTeamA ?? 0} : ${match.scoreTeamB ?? 0}` : tiedFinal ? '–' : 'vs'}</div>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					{!match.isPickup && <TeamLogo logo={match.teamB?.logo} name={match.teamB?.name} />}
					<span className={`truncate text-sm ${nameClass(bWon, aWon)}`}>{match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'TBD')}</span>
				</div>
			</div>

			<div className='w-20 shrink-0 whitespace-nowrap text-right text-xs'>
				{isOpen ? (
					<span className='font-semibold text-signal-ready-text'>OPEN</span>
				) : isLive ? (
					<span className='inline-flex items-center gap-1.5 font-bold text-white'>
						<span aria-hidden className='h-2 w-2 animate-pulse rounded-full bg-signal-live' />
						LIVE
					</span>
				) : isPaused ? (
					<span className='inline-flex items-center gap-1.5 font-bold text-signal-hold'>
						<span aria-hidden className='h-2 w-2 rounded-full bg-signal-hold' />
						PAUSED
					</span>
				) : isCompleted ? (
					<span className='text-muted-foreground'>Final</span>
				) : (
					<span className='font-mono tabular-nums text-muted-foreground'>{formatMatchTime(match.matchDate)}</span>
				)}
			</div>
		</Link>
	);
}

export default function MatchesPage() {
	const [status, setStatus] = useState<StatusFilter>('ALL');
	const [tournamentId, setTournamentId] = useState('');
	const [tournaments, setTournaments] = useState<{ id: number; name: string }[]>([]);
	const [matches, setMatches] = useState<Match[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [canCreateMatch, setCanCreateMatch] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		fetch('/api/tournaments?limit=100')
			.then((r) => r.json())
			.then((data) => setTournaments(Array.isArray(data) ? data.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })) : []))
			.catch((e) => console.error('Failed to load tournaments', e));

		fetch('/api/user')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => setCanCreateMatch(data?.user?.role === 'ADMIN' || data?.user?.role === 'TOURNAMENT_ADMIN'))
			.catch(() => setCanCreateMatch(false));
	}, []);

	useEffect(() => {
		setPage(1);
	}, [status, tournamentId]);

	useEffect(() => {
		setIsLoading(true);
		const params = new URLSearchParams({ page: String(page), limit: String(MATCHES_PER_PAGE) });
		if (status !== 'ALL') params.set('status', status);
		if (tournamentId) params.set('tournamentId', tournamentId);

		fetch(`/api/matches/public?${params.toString()}`)
			.then((r) => r.json())
			.then((data) => {
				setMatches(Array.isArray(data.matches) ? data.matches : []);
				setTotalPages(data.totalPages ?? 1);
			})
			.catch((e) => console.error('Failed to load matches', e))
			.finally(() => setIsLoading(false));
	}, [status, tournamentId, page, refreshKey]);

	const groups = groupByDay(matches);

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
			<div className='mb-6 flex items-center justify-between gap-3'>
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Matches</h1>
				{canCreateMatch && <Button onClick={() => setIsCreateDialogOpen(true)}>Create Match</Button>}
			</div>

			<div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex flex-wrap gap-2'>
					{STATUS_TABS.map((tab) => (
						<Button key={tab.value} variant={status === tab.value ? 'default' : 'outline'} size='sm' aria-pressed={status === tab.value} onClick={() => setStatus(tab.value)}>
							{tab.label}
						</Button>
					))}
				</div>
				<Select value={tournamentId || 'ALL'} onValueChange={(value) => setTournamentId(value === 'ALL' ? '' : value)}>
					<SelectTrigger className='w-full sm:w-56'>
						<SelectValue placeholder='All tournaments' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='ALL'>All tournaments</SelectItem>
						{tournaments.map((t) => (
							<SelectItem key={t.id} value={String(t.id)}>
								{t.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<div role='status' aria-busy='true' className='space-y-2'>
					<span className='sr-only'>Loading matches…</span>
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
					))}
				</div>
			) : matches.length === 0 ? (
				<div className='rounded-md border border-border px-4 py-24 text-center'>
					<p className='font-semibold'>No matches found</p>
					<p className='mt-1 text-sm text-muted-foreground'>{status !== 'ALL' || tournamentId ? 'Nothing matches these filters. Try All, or pick another tournament.' : 'Matches appear here once a tournament starts or a pickup is created.'}</p>
				</div>
			) : (
				<div className='space-y-6'>
					{groups.map((group) => (
						<div key={group.label}>
							<h2 className='mb-2 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-muted-foreground'>{group.label}</h2>
							<div className='space-y-2'>
								{group.matches.map((match) => (
									<MatchRow key={match.id} match={match} />
								))}
							</div>
						</div>
					))}
				</div>
			)}

			<Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} />

			{canCreateMatch && <CreateMatchDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onCreate={() => setRefreshKey((k) => k + 1)} />}
		</div>
	);
}
