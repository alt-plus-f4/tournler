'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LocalClock } from './HomeClient';

// Client pieces of the MODERN ("Classic redesign") homepage: the hero countdown and the day tabs of
// the "This week" list. Both receive plain serializable props from the server layout.

function pad(n: number) {
	return String(n).padStart(2, '0');
}

/** Big mono days / hrs / min / sec. Dashes until mounted, so the cached HTML never shows a stale time. */
export function ModernCountdown({ target }: { target: string }) {
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const left = now === null ? null : Math.max(0, new Date(target).getTime() - now);
	if (left === 0) return <p className='text-2xl font-black uppercase tracking-wide text-white'>Start time reached</p>;
	const parts =
		left === null
			? ['--', '--', '--', '--']
			: [pad(Math.floor(left / 86_400_000)), pad(Math.floor((left / 3_600_000) % 24)), pad(Math.floor((left / 60_000) % 60)), pad(Math.floor((left / 1000) % 60))];
	const labels = ['days', 'hrs', 'min', 'sec'];

	return (
		<div role='timer' aria-live='off' aria-label='Time until the tournament starts' className='grid grid-cols-4 gap-2'>
			{parts.map((value, i) => (
				<div key={labels[i]} className='flex flex-col gap-1'>
					<b className={cn('font-mono text-4xl font-medium leading-none tabular-nums sm:text-[44px]', i === 3 ? 'text-muted-foreground' : 'text-white')}>{value}</b>
					<small className='font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground'>{labels[i]}</small>
				</div>
			))}
		</div>
	);
}

export type ModernWeekRow = {
	id: number;
	iso: string;
	status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED' | string;
	teamA: string;
	teamB: string;
	scoreA: number | null;
	scoreB: number | null;
	meta: string;
};

export type ModernWeekDay = { key: string; label: string; rows: ModernWeekRow[] };

function StateCell({ row }: { row: ModernWeekRow }) {
	if (row.status === 'LIVE') return <span className='font-mono text-[11px] font-semibold tracking-[0.08em] text-signal-live'>LIVE</span>;
	if (row.status === 'PAUSED') return <span className='font-mono text-[11px] font-semibold tracking-[0.08em] text-signal-hold'>PAUSED</span>;
	if (row.status === 'COMPLETED') return <span className='font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground'>FINAL</span>;
	return <LocalClock iso={row.iso} className='font-mono text-sm tabular-nums text-neutral-300' />;
}

function MatchRow({ row }: { row: ModernWeekRow }) {
	const scored = row.status === 'LIVE' || row.status === 'PAUSED' || row.status === 'COMPLETED';
	return (
		<li className='border-b border-border last:border-b-0'>
			<Link
				href={`/matches/${row.id}`}
				className='grid grid-cols-[56px_minmax(0,1fr)_56px_minmax(0,1fr)] items-center gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[72px_minmax(0,1fr)_80px_minmax(0,1fr)_minmax(0,140px)] sm:gap-4 sm:px-5'
			>
				<StateCell row={row} />
				<span className='truncate text-right font-bold uppercase tracking-wide text-white'>{row.teamA}</span>
				{scored ? (
					<span className='text-center font-mono text-lg tabular-nums text-white' aria-label={`${row.scoreA ?? 0} to ${row.scoreB ?? 0}`}>
						{row.scoreA ?? 0} – {row.scoreB ?? 0}
					</span>
				) : (
					<span className='text-center font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground'>vs</span>
				)}
				<span className='truncate font-bold uppercase tracking-wide text-white'>{row.teamB}</span>
				<span className='hidden truncate text-right font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground sm:block'>{row.meta}</span>
			</Link>
		</li>
	);
}

/** "This week": one pill tab per day that has matches (plus today), and that day's matches below. */
export function ModernWeekTabs({ days, initialKey }: { days: ModernWeekDay[]; initialKey: string }) {
	const [selected, setSelected] = useState(initialKey);
	const tabs = useRef<(HTMLButtonElement | null)[]>([]);
	const active = days.find((d) => d.key === selected) ?? days[0];

	function onKeyDown(e: React.KeyboardEvent, index: number) {
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const next = (index + step + days.length) % days.length;
		setSelected(days[next].key);
		tabs.current[next]?.focus();
	}

	return (
		<div className='flex flex-col gap-5'>
			<div role='tablist' aria-label='Day' className='flex flex-wrap gap-1.5'>
				{days.map((day, i) => {
					const isActive = day.key === active.key;
					return (
						<button
							key={day.key}
							ref={(el) => {
								tabs.current[i] = el;
							}}
							type='button'
							role='tab'
							id={`modern-week-tab-${day.key}`}
							aria-selected={isActive}
							aria-controls='modern-week-panel'
							tabIndex={isActive ? 0 : -1}
							onClick={() => setSelected(day.key)}
							onKeyDown={(e) => onKeyDown(e, i)}
							className={cn(
								'h-[34px] rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								isActive ? 'border-white bg-white/10 text-white' : 'border-neutral-800 text-muted-foreground hover:text-white',
							)}
						>
							{day.label} · {day.rows.length}
						</button>
					);
				})}
			</div>
			<div role='tabpanel' id='modern-week-panel' aria-labelledby={`modern-week-tab-${active.key}`} className='overflow-hidden rounded-xl border border-border bg-black'>
				{active.rows.length > 0 ? (
					<ol>
						{active.rows.map((row) => (
							<MatchRow key={row.id} row={row} />
						))}
					</ol>
				) : (
					<p className='px-5 py-6 text-sm text-muted-foreground'>No matches today.</p>
				)}
			</div>
		</div>
	);
}
