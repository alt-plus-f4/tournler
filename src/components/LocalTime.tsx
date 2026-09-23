'use client';

import { useEffect, useState } from 'react';

const FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

/**
 * Renders a timestamp in the viewer's own timezone. Server components only know the server's
 * clock, so the first paint uses a UTC rendering and swaps to local time after mount.
 */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
	const [label, setLabel] = useState(() => new Date(iso).toLocaleString('en-GB', { ...FORMAT, timeZone: 'UTC' }) + ' UTC');

	useEffect(() => {
		setLabel(new Date(iso).toLocaleString(undefined, FORMAT));
	}, [iso]);

	return (
		<time dateTime={iso} className={className} suppressHydrationWarning>
			{label}
		</time>
	);
}
