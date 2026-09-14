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
	return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
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
		return <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-800 text-[10px] font-bold text-gray-400'>{(name || '?').substring(0, 2).toUpperCase()}</div>;
	}
	return <Image src={logo} alt={name || ''} width={32} height={32} className='h-8 w-8 shrink-0 rounded bg-gray-900 object-contain' onError={() => setFailed(true)} />;
}

function MatchRow({ match }: { match: Match }) {
	const isLive = match.status === 'LIVE';
	const isPaused = match.status === 'PAUSED';
	const isCompleted = match.status === 'COMPLETED';
	const isOpen = match.isPickup && match.status === 'SCHEDULED';
	const inProgress = isLive || isPaused || isCompleted;
	const aWon = isCompleted && !!match.winner && match.winner.id === match.teamA?.id;
	const bWon = isCompleted && !!match.winner && match.winner.id === match.teamB?.id;
	const joinedCount = match.participants?.length ?? 0;

	return (
		<Link href={`/matches/${match.id}`} className='flex items-center gap-3 border border-border px-4 py-3 transition-colors hover:bg-white/5'>
			<span className='hidden w-28 shrink-0 truncate text-xs sm:block'>{match.isPickup ? 'Pickup' : match.tournament.name}</span>

			<div className='flex min-w-0 flex-1 items-center justify-center gap-3'>
				<div className='flex min-w-0 flex-1 items-center justify-end gap-2'>
					<span className={`truncate text-sm font-medium ${bWon ? 'text-gray-500' : 'text-white'}`}>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</span>
					{!match.isPickup && <TeamLogo logo={match.teamA?.logo} name={match.teamA?.name} />}
				</div>
				<div className='w-14 shrink-0 text-center font-mono text-sm font-bold text-white'>{isOpen ? `${joinedCount}/10` : inProgress ? `${match.scoreTeamA ?? 0} : ${match.scoreTeamB ?? 0}` : 'vs'}</div>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					{!match.isPickup && <TeamLogo logo={match.teamB?.logo} name={match.teamB?.name} />}
					<span className={`truncate text-sm font-medium ${aWon ? 'text-red-800' : 'text-white'}`}>{match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'TBD')}</span>
				</div>
			</div>

			<div className='w-20 shrink-0 text-right'>
				{isOpen ? (
					<span className='text-xs font-semibold text-green-500'>OPEN</span>
				) : isLive ? (
					<span className='inline-flex items-center gap-1.5 text-xs font-semibold text-red-500'>
						<span className='h-1.5 w-1.5 animate-pulse rounded-full bg-red-500' />
						LIVE
					</span>
				) : isPaused ? (
					<span className='inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400'>
						<span className='h-1.5 w-1.5 rounded-full bg-yellow-400' />
						PAUSED
					</span>
				) : isCompleted ? (
					<span>Final</span>
				) : (
					<span>{formatMatchTime(match.matchDate)}</span>
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
		<div className='w-[78%] mx-auto my-8'>
			<div className='mb-6 flex items-center justify-between'>
				<h1 className='text-2xl font-bold'>Matches</h1>
				{canCreateMatch && <Button onClick={() => setIsCreateDialogOpen(true)}>Create Match</Button>}
			</div>

			<div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex flex-wrap gap-2'>
					{STATUS_TABS.map((tab) => (
						<Button key={tab.value} variant={status === tab.value ? 'default' : 'outline'} size='sm' onClick={() => setStatus(tab.value)}>
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
				<div className='space-y-2'>
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
					))}
				</div>
			) : matches.length === 0 ? (
				<div className='border border-border py-24 text-center text-muted-foreground'>No matches found.</div>
			) : (
				<div className='space-y-6'>
					{groups.map((group) => (
						<div key={group.label}>
							<h2 className='mb-2 text-xs font-bold uppercase tracking-widest text-gray-500'>{group.label}</h2>
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
