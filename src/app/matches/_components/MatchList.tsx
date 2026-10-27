'use client';

import Link from 'next/link';
import { LinkPendingVeil } from '@/components/shell/LinkPending';
import { TeamLogo } from '@/components/TeamLogo';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { GameTag } from '@/components/games/GameMark';

type Side = { id: number; name: string; logo: string | null };

/** The fields the /matches list renders, serialized by the server page. */
export interface MatchListItem {
	id: number;
	status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
	matchDate: string;
	isPickup: boolean;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winnerSide: string | null;
	teamAName: string | null;
	teamBName: string | null;
	tournament: { id: number; name: string; game?: 'CS2' | 'LOL' };
	teamA: Side | null;
	teamB: Side | null;
	winner: Side | null;
	participantCount: number;
}

// Server render + hydration use UTC so both sides agree; after hydration the viewer's own
// timezone takes over (the list used to be client-only, so it always showed local time).
function formatMatchTime(iso: string, timeZone: string | undefined): string {
	return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone });
}

function dayParts(date: Date, timeZone: string | undefined) {
	const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone }).formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return Date.UTC(get('year'), get('month') - 1, get('day'));
}

function dayLabel(iso: string, timeZone: string | undefined): string {
	const date = new Date(iso);
	const now = new Date();
	const diffDays = Math.round((dayParts(date, timeZone) - dayParts(now, timeZone)) / 86400000);
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Tomorrow';
	if (diffDays === -1) return 'Yesterday';
	const sameYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(date) === new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(now);
	return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone, ...(sameYear ? {} : { year: 'numeric' }) });
}

function groupByDay(matches: MatchListItem[], timeZone: string | undefined) {
	const groups: { label: string; matches: MatchListItem[] }[] = [];
	for (const match of matches) {
		const label = dayLabel(match.matchDate, timeZone);
		const last = groups[groups.length - 1];
		if (last && last.label === label) {
			last.matches.push(match);
		} else {
			groups.push({ label, matches: [match] });
		}
	}
	return groups;
}

function MatchRow({ match, timeZone }: { match: MatchListItem; timeZone: string | undefined }) {
	const isLive = match.status === 'LIVE';
	const isPaused = match.status === 'PAUSED';
	const isCompleted = match.status === 'COMPLETED';
	const isOpen = match.isPickup && match.status === 'SCHEDULED';
	// Completed with a tied/empty score = result set by hand; don't print "0 : 0" next to a winner.
	const tiedFinal = isCompleted && (match.scoreTeamA ?? 0) === (match.scoreTeamB ?? 0);
	const inProgress = isLive || isPaused || (isCompleted && !tiedFinal);
	// Pickups record the winning side (winnerSide); team matches record the winning team.
	const aWon = isCompleted && (match.isPickup ? match.winnerSide === 'TEAM_A' : !!match.winner && match.winner.id === match.teamA?.id);
	const bWon = isCompleted && (match.isPickup ? match.winnerSide === 'TEAM_B' : !!match.winner && match.winner.id === match.teamB?.id);
	// Shared result rule: winner white + bold, loser muted, identical for either side.
	const nameClass = (won: boolean, lost: boolean) => (lost ? 'font-medium text-muted-foreground' : won ? 'font-bold text-white' : 'font-medium text-white');
	const scoreClass = (lost: boolean) => (lost ? 'text-muted-foreground' : 'text-white');
	const PILL = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em]';

	return (
		<Link
			href={`/matches/${match.id}`}
			className='relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[8rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)_6rem] sm:gap-x-4'
		>
			<span className='col-span-3 flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:col-span-1'>
				<GameTag game={match.tournament.game ?? 'CS2'} showLabel={false} className='shrink-0' />
				<span className='truncate'>{match.isPickup ? 'Pickup' : match.tournament.name}</span>
			</span>

			<div className='flex min-w-0 items-center justify-end gap-2.5'>
				<span className={`truncate text-right text-sm font-black uppercase tracking-wide ${nameClass(aWon, bWon)}`}>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</span>
				{!match.isPickup && <TeamLogo src={match.teamA?.logo} name={match.teamA?.name} size='sm' decorative />}
			</div>
			<div className='whitespace-nowrap text-center font-mono text-lg font-bold tabular-nums tracking-wider text-white sm:w-[4.5rem]'>
				{isOpen ? (
					<span className='text-sm text-muted-foreground'>{match.participantCount}/10</span>
				) : inProgress ? (
					<>
						<span className={scoreClass(bWon)}>{match.scoreTeamA ?? 0}</span>
						<span className='px-1 text-muted-foreground'>:</span>
						<span className={scoreClass(aWon)}>{match.scoreTeamB ?? 0}</span>
					</>
				) : tiedFinal ? (
					<span className='text-muted-foreground'>–</span>
				) : (
					<span className='text-sm font-medium text-muted-foreground'>vs</span>
				)}
			</div>
			<div className='flex min-w-0 items-center gap-2.5'>
				{!match.isPickup && <TeamLogo src={match.teamB?.logo} name={match.teamB?.name} size='sm' decorative />}
				<span className={`truncate text-sm font-black uppercase tracking-wide ${nameClass(bWon, aWon)}`}>{match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'TBD')}</span>
			</div>

			<div className='col-span-3 flex sm:col-span-1 sm:justify-end'>
				{isOpen ? (
					<span className={`${PILL} bg-white text-black`}>Open</span>
				) : isLive ? (
					<span className={`${PILL} bg-white/10 text-white`}>
						<span aria-hidden className='h-1.5 w-1.5 animate-pulse rounded-full bg-signal-live' />
						Live
					</span>
				) : isPaused ? (
					<span className={`${PILL} bg-white/10 text-signal-hold`}>
						<span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-hold' />
						Paused
					</span>
				) : isCompleted ? (
					<span className={`${PILL} bg-white/5 text-muted-foreground`}>Final</span>
				) : (
					<span className='font-mono text-xs tabular-nums text-muted-foreground'>{formatMatchTime(match.matchDate, timeZone)}</span>
				)}
			</div>
			<LinkPendingVeil />
		</Link>
	);
}

export function MatchList({ matches }: { matches: MatchListItem[] }) {
	const timeZone = useHydrated() ? undefined : 'UTC';
	const groups = groupByDay(matches, timeZone);

	return (
		<div className='space-y-2'>
			{groups.map((group) => (
				<section key={group.label} aria-label={group.label}>
					<h2 className='whitespace-nowrap pb-2 pt-5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground'>{group.label}</h2>
					<div className='overflow-hidden rounded-md border border-border bg-card/40'>
						{group.matches.map((match) => (
							<MatchRow key={match.id} match={match} timeZone={timeZone} />
						))}
					</div>
				</section>
			))}
		</div>
	);
}
