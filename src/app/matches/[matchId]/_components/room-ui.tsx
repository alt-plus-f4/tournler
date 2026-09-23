'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { TeamLogo } from '@/components/TeamLogo';
import { Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, type Match } from './types';

/** Ticks once a second while `active`, forcing the caller to re-render (keeps live timers current between SWR polls). */
export function useTicker(active: boolean) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(id);
	}, [active]);
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
	return <p className={cn('flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground', className)}>{children}</p>;
}

/** The room's one container: flat, hairline, tight corners. Header row carries a Section Label and optional trailing control. */
export function RoomPanel({ label, action, children, className, bodyClassName }: { label?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
	return (
		<section className={cn('rounded-md border border-border bg-neutral-950/90', className)}>
			{label && (
				<header className='flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2'>
					<SectionLabel>{label}</SectionLabel>
					{action}
				</header>
			)}
			<div className={cn('p-4', bodyClassName)}>{children}</div>
		</section>
	);
}

/** Status dot. Pulses only for states the server actually reported (live, ready, on the clock). */
export function SignalDot({ tone, pulse = false, className }: { tone: 'live' | 'ready' | 'hold'; pulse?: boolean; className?: string }) {
	const color = tone === 'live' ? 'bg-signal-live' : tone === 'ready' ? 'bg-signal-ready' : 'bg-signal-hold';
	return (
		<span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden>
			{pulse && <span className={cn('absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping', color)} />}
			<span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
		</span>
	);
}

/**
 * Dot · state word · mono timer — the Booth's signature readout, one per match state. It owns the
 * 1s ticker, so only this readout re-renders every second, not the room. Not a live region: the
 * per-second timer would spam screen readers (RoomHeader announces status/score changes instead).
 */
export function StatusReadout({ match }: { match: Match }) {
	useTicker(match.status === 'LIVE' || match.status === 'SCHEDULED');

	if (match.status === 'LIVE') {
		const elapsed = match.startedAt ? Date.now() - new Date(match.startedAt).getTime() : 0;
		return (
			<span className='inline-flex items-center gap-2 text-sm font-bold text-white'>
				<SignalDot tone='live' pulse />
				LIVE
				<span className='font-mono font-normal tabular-nums text-neutral-300'>{formatDuration(elapsed)}</span>
			</span>
		);
	}

	if (match.status === 'PAUSED') {
		const elapsed = match.startedAt && match.pausedAt ? new Date(match.pausedAt).getTime() - new Date(match.startedAt).getTime() : 0;
		return (
			<span className='inline-flex items-center gap-2 text-sm font-bold text-signal-hold'>
				<SignalDot tone='hold' />
				PAUSED
				<span className='font-mono font-normal tabular-nums'>{formatDuration(elapsed)}</span>
			</span>
		);
	}

	if (match.status === 'COMPLETED') {
		const duration = match.startedAt && match.completedAt ? new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime() : null;
		return (
			<span className='inline-flex items-center gap-2.5 text-sm text-muted-foreground'>
				<span className='rounded-sm border border-neutral-600 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-white'>Final</span>
				{duration !== null && (
					<span>
						Played in <span className='font-mono tabular-nums text-neutral-300'>{formatDuration(duration)}</span>
					</span>
				)}
			</span>
		);
	}

	const msUntilStart = new Date(match.matchDate).getTime() - Date.now();
	// Pre-warmed (~5 min before start, see prewarmUpcomingMatches) — the server is joinable even
	// though the match only flips LIVE once MatchZy reports the series began (goLiveFromServer).
	if (match.gameServer?.matchConfigLoadedAt) {
		return (
			<span className='inline-flex items-center gap-2 text-sm font-bold text-white'>
				<SignalDot tone='ready' pulse />
				Server ready
				<span className='font-mono font-normal tabular-nums text-neutral-300'>{msUntilStart > 0 ? `starts in ${formatDuration(msUntilStart)}` : 'starting soon'}</span>
			</span>
		);
	}
	return (
		<span className='inline-flex items-center gap-2 text-sm text-neutral-300'>
			<Hourglass className='h-4 w-4 text-muted-foreground' aria-hidden />
			{msUntilStart > 0 ? (
				<>
					Starts in <span className='font-mono tabular-nums'>{formatDuration(msUntilStart)}</span>
				</>
			) : (
				'Waiting to start'
			)}
		</span>
	);
}

/** A side's team logo in the match room — the shared sponsor-plate TeamLogo, dimmed for the losing side. */
export function TeamMark({ logo, name, size = 'lg', dim = false }: { logo: string | null | undefined; name: string; size?: 'sm' | 'lg'; dim?: boolean }) {
	return <TeamLogo src={logo} name={name} decorative size={size === 'lg' ? 'lg' : 'sm'} className={cn(size === 'lg' && 'sm:h-20 sm:w-20 sm:p-2 sm:text-2xl', size === 'sm' && 'h-9 w-9', dim && 'opacity-60 grayscale')} />;
}

export function PlayerAvatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
	const [failed, setFailed] = useState(false);
	if (src && !failed) {
		// eslint-disable-next-line @next/next/no-img-element
		return <img src={src} alt='' width={size} height={size} style={{ width: size, height: size }} className='shrink-0 rounded-full border border-border object-cover' onError={() => setFailed(true)} />;
	}
	return (
		<span style={{ width: size, height: size }} className='flex shrink-0 items-center justify-center rounded-full border border-border bg-neutral-900 text-xs font-bold text-neutral-400' aria-hidden>
			{name.charAt(0).toUpperCase()}
		</span>
	);
}
