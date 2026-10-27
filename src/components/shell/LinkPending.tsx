'use client';

import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Instant click feedback for a <Link> whose destination isn't ready yet (prefetch still running, or a
 * dynamic route streaming its loading.tsx). Must render as a descendant of the <Link> (useLinkStatus
 * reads the nearest one). Both variants are always mounted and absolutely positioned, so toggling
 * `pending` only changes opacity — no layout shift. The short enter delay keeps already-prefetched
 * (instant) navigations from flashing, and motion-reduce drops the transition and the pulse.
 */

/** A thin underline bar along the bottom edge of a nav link. The Link (or its wrapper) must be `relative`. */
export function LinkPendingBar({ className }: { className?: string }) {
	const { pending } = useLinkStatus();
	return (
		<span
			aria-hidden
			data-pending={pending ? '' : undefined}
			className={cn(
				'pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white transition-opacity duration-150 motion-reduce:transition-none',
				pending ? 'animate-pulse opacity-80 delay-100 motion-reduce:animate-none' : 'opacity-0',
				className,
			)}
		/>
	);
}

/** A dim veil over a whole card or row. The Link (or the row it stretches over) must be `relative`. */
export function LinkPendingVeil({ className }: { className?: string }) {
	const { pending } = useLinkStatus();
	return (
		<span
			aria-hidden
			data-pending={pending ? '' : undefined}
			className={cn(
				'pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-black/40 transition-opacity duration-150 motion-reduce:transition-none',
				pending ? 'animate-pulse opacity-100 delay-100 motion-reduce:animate-none' : 'opacity-0',
				className,
			)}
		/>
	);
}
