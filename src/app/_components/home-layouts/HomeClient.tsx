'use client';

import { useEffect, useState } from 'react';

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

/**
 * A match start time (HH:mm) in the viewer's own timezone. The server only knows its own clock, so
 * the first paint is a UTC rendering that swaps to local time after mount.
 */
export function LocalClock({ iso, className }: { iso: string; className?: string }) {
	const [label, setLabel] = useState(() => new Date(iso).toLocaleTimeString('en-GB', { ...TIME, timeZone: 'UTC' }) + ' UTC');

	useEffect(() => {
		setLabel(new Date(iso).toLocaleTimeString('en-GB', TIME));
	}, [iso]);

	return (
		<time dateTime={iso} className={className} suppressHydrationWarning>
			{label}
		</time>
	);
}

function pad(n: number) {
	return String(n).padStart(2, '0');
}

/** Days / hours / minutes / seconds to `target`. Renders dashes until mounted so the cached HTML never shows a stale time. */
export function Countdown({ target }: { target: string }) {
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const left = now === null ? null : Math.max(0, new Date(target).getTime() - now);
	const parts =
		left === null
			? ['--', '--', '--', '--']
			: [String(Math.floor(left / 86_400_000)), pad(Math.floor((left / 3_600_000) % 24)), pad(Math.floor((left / 60_000) % 60)), pad(Math.floor((left / 1000) % 60))];
	const labels = ['Days', 'Hours', 'Min', 'Sec'];
	const started = left === 0;

	return (
		<div role='timer' aria-live='off' aria-label={started ? 'The tournament has started' : 'Time until the tournament starts'}>
			{started ? (
				<p className='text-lg font-black uppercase tracking-wide text-white'>Start time reached</p>
			) : (
				<div className='grid grid-cols-4 gap-2'>
					{parts.map((value, i) => (
						<div key={labels[i]} className='rounded-md border border-border bg-neutral-950 px-1 py-2.5 text-center'>
							<b className='block font-mono text-2xl font-black leading-none tabular-nums text-white sm:text-3xl'>{value}</b>
							<small className='mt-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground'>{labels[i]}</small>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
