'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RewatchConfig } from './rewatch-config';

function TeamMark({ name, logo, align }: { name: string; logo: string | null; align: 'start' | 'end' }) {
	return (
		<div className={cn('flex min-w-0 items-center gap-2 sm:gap-3', align === 'end' && 'flex-row-reverse text-right')}>
			{logo ? (
				// Admin-supplied logos can live on any host, so this skips next/image's remotePatterns allowlist.
				// eslint-disable-next-line @next/next/no-img-element
				<img src={logo} alt='' width={32} height={32} className='h-6 w-6 shrink-0 object-contain sm:h-8 sm:w-8' draggable={false} />
			) : (
				<span aria-hidden className='flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-neutral-900 font-mono text-[10px] text-muted-foreground sm:h-8 sm:w-8'>
					{name.slice(0, 2).toUpperCase()}
				</span>
			)}
			<span className='truncate text-base font-black uppercase tracking-wide text-white sm:text-2xl'>{name}</span>
		</div>
	);
}

/**
 * Homepage VOD player. Renders a static poster (YouTube thumbnail + play button) and only swaps in
 * the YouTube iframe on click, so the homepage doesn't pay for YouTube's player JS up front and
 * nothing plays until the viewer asks for it. Always labelled as a rewatch — never as live.
 */
export function RewatchPlayer({ rewatch }: { rewatch: RewatchConfig }) {
	const [playing, setPlaying] = useState(false);
	const hasTeams = Boolean(rewatch.teamA && rewatch.teamB);
	const label = `Rewatch: ${rewatch.title}`;

	return (
		<section aria-labelledby='rewatch-heading' className='overflow-hidden rounded-md border border-border bg-black'>
			{hasTeams ? (
				<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border px-4 py-3 sm:gap-6 sm:px-6 sm:py-4'>
					<TeamMark name={rewatch.teamA} logo={rewatch.teamALogo} align='start' />
					<h2 id='rewatch-heading' className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
						<span className='sr-only'>{label}</span>
						<span aria-hidden>Rewatch</span>
					</h2>
					<TeamMark name={rewatch.teamB} logo={rewatch.teamBLogo} align='end' />
				</div>
			) : (
				<div className='flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4'>
					<h2 id='rewatch-heading' className='min-w-0 truncate text-base font-black uppercase tracking-wide text-white sm:text-2xl'>
						{rewatch.title}
					</h2>
					<span className='shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>Rewatch</span>
				</div>
			)}

			<div className='relative aspect-video w-full bg-neutral-950'>
				{playing ? (
					<iframe
						className='absolute inset-0 h-full w-full'
						src={`https://www.youtube-nocookie.com/embed/${rewatch.videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`}
						title={label}
						allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
						allowFullScreen
						// YouTube refuses to play (error 153) without a referrer, so don't strip it.
						referrerPolicy='strict-origin-when-cross-origin'
					/>
				) : (
					<button type='button' onClick={() => setPlaying(true)} className='group absolute inset-0 block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
						<span className='sr-only'>Play {label}</span>
						{/* i.ytimg.com isn't in next/image's allowlist, and the poster is already a sized, cached CDN jpg. */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={`https://i.ytimg.com/vi/${rewatch.videoId}/hqdefault.jpg`} alt='' className='absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-90' draggable={false} />
						<span aria-hidden className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent' />
						<span aria-hidden className='absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out motion-safe:group-hover:scale-110 sm:h-20 sm:w-20'>
							<Play className='ml-1 h-6 w-6 fill-current sm:h-8 sm:w-8' />
						</span>
						<span aria-hidden className='absolute bottom-3 left-4 right-4 truncate text-left text-sm font-medium text-white sm:bottom-4 sm:left-6'>
							{rewatch.title}
						</span>
					</button>
				)}
			</div>

			<div className='flex items-center justify-between gap-4 px-4 py-2.5 text-xs text-muted-foreground sm:px-6'>
				<span>Recorded broadcast</span>
				<a href={`https://www.youtube.com/watch?v=${rewatch.videoId}`} target='_blank' rel='noopener noreferrer' className='font-medium underline-offset-4 transition-colors hover:text-white hover:underline'>
					Open on YouTube
				</a>
			</div>
		</section>
	);
}
