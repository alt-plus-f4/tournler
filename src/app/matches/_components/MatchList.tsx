'use client';

import Link from 'next/link';
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
	// Shared result rule: winner white + bold, loser muted — identical for either side.
	const nameClass = (won: boolean, lost: boolean) => (lost ? 'text-muted-foreground' : won ? 'font-bold text-white' : 'font-medium text-white');

	return (
		<Link href={`/matches/${match.id}`} className='flex items-center gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:px-4'>
			<GameTag game={match.tournament.game ?? 'CS2'} showLabel={false} className='shrink-0' />
			<span className='hidden w-28 shrink-0 truncate text-xs text-muted-foreground sm:block'>{match.isPickup ? 'Pickup' : match.tournament.name}</span>

			<div className='flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3'>
				<div className='flex min-w-0 flex-1 items-center justify-end gap-2'>
					<span className={`truncate text-sm ${nameClass(aWon, bWon)}`}>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</span>
					{!match.isPickup && <TeamLogo src={match.teamA?.logo} name={match.teamA?.name} size='sm' decorative />}
				</div>
				<div className='w-14 shrink-0 whitespace-nowrap text-center font-mono text-sm font-bold tabular-nums text-white'>{isOpen ? `${match.participantCount}/10` : inProgress ? `${match.scoreTeamA ?? 0} : ${match.scoreTeamB ?? 0}` : tiedFinal ? '–' : 'vs'}</div>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					{!match.isPickup && <TeamLogo src={match.teamB?.logo} name={match.teamB?.name} size='sm' decorative />}
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
					<span className='font-mono tabular-nums text-muted-foreground'>{formatMatchTime(match.matchDate, timeZone)}</span>
				)}
			</div>
		</Link>
	);
}

export function MatchList({ matches }: { matches: MatchListItem[] }) {
	const timeZone = useHydrated() ? undefined : 'UTC';
	const groups = groupByDay(matches, timeZone);

	return (
		<div className='space-y-6'>
			{groups.map((group) => (
				<div key={group.label}>
					<h2 className='mb-2 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-muted-foreground'>{group.label}</h2>
					<div className='space-y-2'>
						{group.matches.map((match) => (
							<MatchRow key={match.id} match={match} timeZone={timeZone} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
