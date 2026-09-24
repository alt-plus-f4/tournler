'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrophyIcon, type TrophyVisual } from '@/components/trophies/TrophyIcon';
import { isOptimizable } from '@/lib/image-hosts';
import { cn } from '@/lib/utils';

/** A badge an admin awarded (non-overlay badges only). */
export interface TrophyAward {
	awardedAt: string;
	badge: TrophyVisual & { id: number; description: string | null };
}

/** An event trophy: a completed tournament the player won with their team (derived, never awarded). */
export interface EventTrophyItem {
	tournamentId: number;
	name: string;
	imageUrl: string | null;
	imageKind: 'logo' | 'banner' | null;
	wonAt: string;
	teamName: string;
}

type SliderItem = { kind: 'badge'; key: string; date: string; award: TrophyAward } | { kind: 'event'; key: string; date: string; event: EventTrophyItem };

function formatDate(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const FADE = '48px';

/**
 * HLTV-style trophy row: one horizontal line of trophy artwork, newest first, scroll-snapped.
 * Arrows page it on desktop; touch devices just swipe. Renders nothing when there are no trophies.
 */
export function TrophySlider({ trophies, events = [], className }: { trophies: TrophyAward[]; events?: EventTrophyItem[]; className?: string }) {
	const scrollerRef = useRef<HTMLUListElement>(null);
	const [canPrev, setCanPrev] = useState(false);
	const [canNext, setCanNext] = useState(false);

	const sorted: SliderItem[] = [
		...events.map((event): SliderItem => ({ kind: 'event', key: `event-${event.tournamentId}`, date: event.wonAt, event })),
		...trophies.map((award): SliderItem => ({ kind: 'badge', key: `badge-${award.badge.id}`, date: award.awardedAt, award })),
	].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const measure = useCallback(() => {
		const el = scrollerRef.current;
		if (!el) return;
		setCanPrev(el.scrollLeft > 1);
		setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
	}, []);

	useEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;
		measure();
		el.addEventListener('scroll', measure, { passive: true });
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', measure);
			ro.disconnect();
		};
	}, [measure, sorted.length]);

	if (sorted.length === 0) return null;

	const page = (dir: -1 | 1) => {
		const el = scrollerRef.current;
		if (!el) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 96), behavior: reduce ? 'auto' : 'smooth' });
	};

	// Only fade the edge that actually has more trophies behind it.
	const mask = `linear-gradient(to right, ${canPrev ? 'transparent' : '#000'} 0, #000 ${canPrev ? FADE : '0px'}, #000 calc(100% - ${canNext ? FADE : '0px'}), ${canNext ? 'transparent' : '#000'} 100%)`;

	const arrow = 'flex h-8 w-8 items-center justify-center rounded-md border border-border text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

	return (
		<section aria-labelledby='profile-trophies-label' className={className}>
			<div className='mb-3 flex items-center justify-between gap-3'>
				<h2 id='profile-trophies-label' className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
					Trophies <span aria-hidden className='text-neutral-600'>·</span> <span className='font-mono tabular-nums'>{sorted.length}</span>
				</h2>
				{(canPrev || canNext) && (
					<div className='hidden gap-1.5 sm:flex'>
						<button type='button' onClick={() => page(-1)} disabled={!canPrev} aria-label='Previous trophies' aria-controls='profile-trophies-list' className={arrow}>
							<ChevronLeft className='h-4 w-4' />
						</button>
						<button type='button' onClick={() => page(1)} disabled={!canNext} aria-label='Next trophies' aria-controls='profile-trophies-list' className={arrow}>
							<ChevronRight className='h-4 w-4' />
						</button>
					</div>
				)}
			</div>

			<TooltipProvider delayDuration={150}>
				<ul
					id='profile-trophies-list'
					ref={scrollerRef}
					className='-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-px-1 px-1 pb-1 [scrollbar-width:none] motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden'
					style={{ maskImage: mask, WebkitMaskImage: mask }}
				>
					{sorted.map((item) => (
						<li key={item.key} className='w-28 shrink-0 snap-start'>
							{item.kind === 'event' ? <EventTile event={item.event} /> : <BadgeTile award={item.award} />}
						</li>
					))}
				</ul>
			</TooltipProvider>
		</section>
	);
}

const TILE = 'group flex flex-col items-center gap-2 rounded-md px-1 py-2 text-center outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
const TOOLTIP = 'max-w-[240px] border-border bg-neutral-950 text-white';

function BadgeTile({ award: { badge, awardedAt } }: { award: TrophyAward }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div tabIndex={0} className={TILE}>
					<TrophyIcon badge={badge} size={64} decorative className='transition-[filter] duration-200 group-hover:brightness-110' />
					<span className='w-full min-w-0'>
						<span className='block truncate text-xs font-bold text-white'>{badge.name}</span>
						<span className='mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground'>{new Date(awardedAt).getFullYear()}</span>
					</span>
				</div>
			</TooltipTrigger>
			<TooltipContent side='bottom' className={TOOLTIP}>
				<p className='text-sm font-bold'>{badge.name}</p>
				{badge.description && <p className='mt-0.5 text-xs text-neutral-300'>{badge.description}</p>}
				<p className='mt-1 font-mono text-xs tabular-nums text-muted-foreground'>Awarded {formatDate(awardedAt)}</p>
			</TooltipContent>
		</Tooltip>
	);
}

/**
 * Tournament artwork at trophy size. Logos sit on the same light plate as TeamLogo so dark marks
 * stay visible on black; a banner is cropped to the square; no artwork falls back to a trophy glyph.
 */
function EventArt({ event }: { event: EventTrophyItem }) {
	const [failed, setFailed] = useState(false);
	const box = 'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm transition-[filter] duration-200 group-hover:brightness-110';
	if (!event.imageUrl || failed) {
		return (
			<span aria-hidden className={cn(box, 'border border-border bg-neutral-900 text-neutral-200')}>
				<Trophy className='h-8 w-8' strokeWidth={1.75} />
			</span>
		);
	}
	const logo = event.imageKind === 'logo';
	return (
		<span aria-hidden className={cn(box, logo ? 'bg-neutral-100 p-2' : 'border border-border bg-neutral-900')}>
			<Image
				src={event.imageUrl}
				alt=''
				width={64}
				height={64}
				unoptimized={!isOptimizable(event.imageUrl)}
				onError={() => setFailed(true)}
				className={cn('h-full w-full', logo ? 'object-contain' : 'object-cover')}
			/>
		</span>
	);
}

function EventTile({ event }: { event: EventTrophyItem }) {
	const year = new Date(event.wonAt).getFullYear();
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link href={`/tournaments/${event.tournamentId}`} aria-label={`${event.name} ${year}, champion${event.teamName ? ` with ${event.teamName}` : ''}`} className={TILE}>
					<EventArt event={event} />
					<span className='w-full min-w-0'>
						<span className='block truncate text-xs font-bold text-white'>{event.name}</span>
						<span className='mt-0.5 block truncate text-xs text-muted-foreground'>
							Champion <span aria-hidden>·</span> <span className='font-mono tabular-nums'>{year}</span>
						</span>
					</span>
				</Link>
			</TooltipTrigger>
			<TooltipContent side='bottom' className={TOOLTIP}>
				<p className='text-sm font-bold'>{event.name}</p>
				<p className='mt-0.5 text-xs text-neutral-300'>Champion{event.teamName ? ` with ${event.teamName}` : ''}</p>
				<p className='mt-1 font-mono text-xs tabular-nums text-muted-foreground'>Won {formatDate(event.wonAt)}</p>
			</TooltipContent>
		</Tooltip>
	);
}
