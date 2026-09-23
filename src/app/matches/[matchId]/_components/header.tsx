'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMapDisplayName, getMapImage } from '@/lib/tournaments/maps';
import { StatusReadout, TeamMark } from './room-ui';
import { getBestOf, getSideLabels, getWinningSide, type Match, type Side } from './types';

/** "BO3 · Pickup · Captain draft" — the BO part is left out when the series length isn't known. */
function formatLabel(match: Match) {
	const bestOf = getBestOf(match);
	const parts = [bestOf ? `BO${bestOf}` : null, match.isPickup ? 'Pickup' : null, match.isPickup && match.pickupMode === 'CAPTAIN_DRAFT' ? 'Captain draft' : null];
	return parts.filter(Boolean).join(' · ');
}

const STATUS_WORD: Record<Match['status'], string> = { SCHEDULED: 'Upcoming', LIVE: 'Live', PAUSED: 'Paused', COMPLETED: 'Final' };

/**
 * The room's broadcast band: breadcrumb and state on top, the face-off in the middle, tabs along
 * the bottom edge. State drives the whole band — LIVE gets the red rule and full-colour map art,
 * PAUSED goes amber, FINAL drains to grayscale and hands the ink to the winner.
 */
export function RoomHeader({ match, quickBar, tabs }: { match: Match; quickBar?: ReactNode; tabs: ReactNode }) {
	const { teamALabel, teamBLabel } = getSideLabels(match);
	const winningSide = getWinningSide(match);
	const isFinal = match.status === 'COMPLETED';
	const isSeries = (getBestOf(match) ?? 1) > 1;

	// The map in progress (maps are pre-sorted by order); once all are done, the last one played.
	const currentMap = match.maps.find((m) => m.status !== 'COMPLETED');
	const displayMap = currentMap ?? (match.maps.length > 0 ? match.maps[match.maps.length - 1] : undefined);
	const mapImage = displayMap ? getMapImage(displayMap.mapName) : null;
	const mapIndex = displayMap ? match.maps.indexOf(displayMap) + 1 : 0;

	// While a map is being played the headline is its live round score; a finished series shows
	// the map count (2–1) instead — a bo1's match score and map score are the same number.
	const headlineA = isFinal && isSeries ? (match.scoreTeamA ?? 0) : displayMap ? (displayMap.scoreTeamA ?? 0) : (match.scoreTeamA ?? 0);
	const headlineB = isFinal && isSeries ? (match.scoreTeamB ?? 0) : displayMap ? (displayMap.scoreTeamB ?? 0) : (match.scoreTeamB ?? 0);

	// A tied/empty final can't have produced the winner — the result was set by hand, so don't print
	// "0 : 0" under a Winner tag (the Result panel says who recorded it).
	const noDecidingScore = isFinal && winningSide !== null && headlineA === headlineB;

	// Polite live region: one concise line that changes only when status or score changes (the
	// per-second timer lives in StatusReadout, outside it). SWR polling feeds it every 4s.
	const winnerLabel = winningSide === 'TEAM_A' ? teamALabel : winningSide === 'TEAM_B' ? teamBLabel : null;
	const announcement =
		match.status === 'SCHEDULED'
			? `${STATUS_WORD.SCHEDULED}.`
			: noDecidingScore
				? `${STATUS_WORD.COMPLETED}. ${winnerLabel} won; result recorded by an organizer.`
				: `${STATUS_WORD[match.status]}. ${teamALabel} ${headlineA}, ${teamBLabel} ${headlineB}.${isFinal && winnerLabel ? ` ${winnerLabel} won.` : ''}`;

	const sideAParticipants = match.participants.filter((p) => p.side === 'TEAM_A').length;
	const sideBParticipants = match.participants.filter((p) => p.side === 'TEAM_B').length;

	const plate = (side: Side) => {
		const isA = side === 'TEAM_A';
		const team = isA ? match.teamA : match.teamB;
		const label = isA ? teamALabel : teamBLabel;
		const result = winningSide ? (winningSide === side ? 'win' : 'loss') : null;
		const joined = isA ? sideAParticipants : sideBParticipants;
		return (
			<div className={cn('flex min-w-0 flex-col items-center gap-3 sm:gap-5', isA ? 'sm:flex-row-reverse sm:justify-start' : 'sm:flex-row sm:justify-start', result === 'loss' && 'opacity-60')}>
				<TeamMark logo={match.isPickup ? null : team?.logo} name={label} background={match.isPickup ? null : team?.background} dim={result === 'loss'} />
				<div className={cn('flex min-w-0 max-w-full flex-col items-center', isA ? 'sm:items-end' : 'sm:items-start')}>
					<p
						className={cn(
							'line-clamp-2 max-w-full hyphens-none text-center [overflow-wrap:normal] [word-break:keep-all] text-base font-black uppercase leading-tight tracking-wide sm:line-clamp-1 sm:text-3xl',
							isA ? 'sm:text-right' : 'sm:text-left',
							!match.isPickup && !team ? 'text-muted-foreground' : 'text-white',
						)}
					>
						{label}
					</p>
					<div className='mt-1.5 h-5'>
						{result === 'win' && <span className='rounded-sm bg-white px-1.5 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-black'>Win</span>}
						{match.isPickup && match.status === 'SCHEDULED' && (
							<span className='font-mono text-xs tabular-nums text-muted-foreground'>
								{joined}/5 <span className='font-sans'>joined</span>
							</span>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<section className='relative isolate overflow-hidden border-b border-border bg-black'>
			{mapImage && (
				<Image src={mapImage} alt='' fill priority sizes='100vw' className={cn('-z-20 object-cover transition-[filter,opacity] duration-500', isFinal ? 'opacity-20 grayscale' : match.status === 'SCHEDULED' ? 'opacity-25' : 'opacity-40')} />
			)}
			<div className='absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/70 to-black' />
			{(match.status === 'LIVE' || match.status === 'PAUSED') && <div className={cn('absolute inset-x-0 top-0 h-[3px]', match.status === 'LIVE' ? 'bg-signal-live' : 'bg-signal-hold')} aria-hidden />}

			<div className='mx-auto max-w-7xl px-4'>
				<div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-5'>
					<div className='flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2'>
						<nav aria-label='Breadcrumb' className='flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground'>
							{match.isPickup ? (
								<Link href='/matches' className='shrink-0 hover:text-white'>
									Matches
								</Link>
							) : (
								<Link href={`/tournaments/${match.tournament.id}`} className='truncate underline-offset-4 hover:text-white hover:underline'>
									{match.tournament.name}
								</Link>
							)}
							<ChevronRight className='h-3.5 w-3.5 shrink-0' aria-hidden />
							<span className='shrink-0 text-white' aria-current='page'>
								Match {match.id}
							</span>
							<span className='hidden shrink-0 sm:inline' aria-hidden>
								·
							</span>
							{formatLabel(match) && <span className='hidden shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline'>{formatLabel(match)}</span>}
						</nav>
						<StatusReadout match={match} />
					</div>
					{quickBar}
				</div>

				<h1 className='sr-only'>
					{teamALabel} vs {teamBLabel}, match {match.id}
				</h1>
				<p className='sr-only' aria-live='polite' aria-atomic='true'>
					{announcement}
				</p>

				<div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-8 sm:gap-10 sm:py-12'>
					{plate('TEAM_A')}

					<div className='flex flex-col items-center text-center'>
						{match.status === 'SCHEDULED' ? (
							<>
								<span className='text-3xl font-black text-neutral-500 sm:text-5xl' aria-hidden>
									VS
								</span>
								<span className='mt-2 font-mono text-xs tabular-nums text-muted-foreground' suppressHydrationWarning>
									{new Date(match.matchDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
								</span>
							</>
						) : noDecidingScore ? (
							<>
								<span className='font-mono text-5xl font-bold leading-none text-neutral-500 sm:text-7xl' aria-hidden>
									–<span className='mx-2 text-neutral-700 sm:mx-3'>:</span>–
								</span>
								<span className='mt-2 text-xs text-muted-foreground'>Result set by an organizer</span>
							</>
						) : (
							<>
								{/* Visual only — the sr-only live region above carries the score in words. */}
								<div className='flex items-baseline font-mono text-5xl font-bold tabular-nums leading-none sm:text-7xl' aria-hidden>
									<span className={cn(winningSide === 'TEAM_B' ? 'text-muted-foreground' : 'text-white')}>{headlineA}</span>
									<span className='mx-2 text-neutral-700 sm:mx-3'>:</span>
									<span className={cn(winningSide === 'TEAM_A' ? 'text-muted-foreground' : 'text-white')}>{headlineB}</span>
								</div>
							</>
						)}
						{displayMap && (
							<span className='mt-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-300'>
								{getMapDisplayName(displayMap.mapName)}
								{isSeries && match.status !== 'SCHEDULED' && !isFinal && (
									<span className='block font-mono font-normal tabular-nums text-muted-foreground sm:inline'>
										<span className='hidden sm:inline'> · map {mapIndex} · </span>
										series {match.scoreTeamA ?? 0}–{match.scoreTeamB ?? 0}
									</span>
								)}
							</span>
						)}
					</div>

					{plate('TEAM_B')}
				</div>

				{tabs}
			</div>
		</section>
	);
}
