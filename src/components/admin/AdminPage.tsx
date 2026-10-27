import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Page frame shared by every /admin screen. */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('mx-4 mb-12 mt-10 max-w-6xl md:mx-10', className)}>{children}</div>;
}

/** Eyebrow + big uppercase title + optional subtitle on the left, actions on the right. */
export function AdminHeader({ title, subtitle, actions, className }: { title: string; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
	return (
		<header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
			<div className='min-w-0'>
				<p className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Admin</p>
				<h1 className='mt-1 text-3xl font-black uppercase tracking-wide'>{title}</h1>
				{subtitle && <p className='mt-1.5 max-w-prose text-sm text-muted-foreground'>{subtitle}</p>}
			</div>
			{actions && <div className='flex flex-wrap items-center gap-3'>{actions}</div>}
		</header>
	);
}

/** Search + filter row above a table. */
export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>;
}

/** Small section label used inside admin pages. */
export function AdminEyebrow({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
	return (
		<h2 id={id} className={cn('text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground', className)}>
			{children}
		</h2>
	);
}

/** Bordered card panel. */
export function AdminPanel({ children, className }: { children: ReactNode; className?: string }) {
	return <section className={cn('rounded-lg border border-border bg-card p-5', className)}>{children}</section>;
}

const PILL_TONES = {
	neutral: 'bg-muted text-muted-foreground',
	live: 'bg-signal-live text-white',
	ready: 'bg-signal-ready/15 text-signal-ready-text',
	hold: 'bg-signal-hold/15 text-signal-hold',
	line: 'border border-border text-muted-foreground',
} as const;

export function StatusPill({ tone = 'neutral', children, className }: { tone?: keyof typeof PILL_TONES; children: ReactNode; className?: string }) {
	return (
		<span
			className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 font-mono text-[10.5px] font-semibold uppercase leading-none tracking-widest', PILL_TONES[tone], className)}
		>
			{tone === 'live' && <span aria-hidden className='h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse' />}
			{children}
		</span>
	);
}

/** Segmented filter control (aria-pressed buttons). */
export const segmentedGroup = 'inline-flex rounded-md border border-border bg-card p-0.5';
export const segmentedButton = (active: boolean) =>
	cn(
		'h-8 rounded-sm px-3 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
		active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
	);

/** Empty / error block for non-table lists. */
export function AdminEmpty({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground', className)}>{children}</div>;
}
