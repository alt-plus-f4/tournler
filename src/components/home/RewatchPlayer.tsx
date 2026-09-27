'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLogo } from '@/components/TeamLogo';
import type { RewatchConfig } from './rewatch-config';

function TeamMark({ name, logo, align }: { name: string; logo: string | null; align: 'start' | 'end' }) {
	return (
		<div className={cn('flex min-w-0 items-center gap-2 sm:gap-3', align === 'end' && 'flex-row-reverse text-right')}>
			<TeamLogo src={logo} name={name} decorative size='xs' className='sm:h-8 sm:w-8 sm:p-1 sm:text-xs' />
			<span className='truncate text-base font-black uppercase tracking-wide text-white sm:text-2xl'>{name}</span>
		</div>
	);
}

/**
 * Homepage watch player. Renders a static poster (thumbnail + play button) and only swaps in the
 * YouTube/Twitch iframe on click, so the homepage doesn't pay for the embed's player JS up front
 * and nothing plays until the viewer asks for it.
 */
export function RewatchPlayer({ rewatch, priority = true }: { rewatch: RewatchConfig; /** true when the poster is the page's LCP hero (no live match above it). */ priority?: boolean }) {
	const [playing, setPlaying] = useState(false);
	const hasTeams = Boolean(rewatch.teamA && rewatch.teamB);
	const isTwitch = rewatch.provider === 'twitch';
	const kicker = isTwitch ? 'Live stream' : 'Rewatch';
	const label = `${kicker}: ${rewatch.title}`;
	const posterSrc = isTwitch ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${rewatch.videoId.toLowerCase()}-960x540.jpg` : `https://i.ytimg.com/vi/${rewatch.videoId}/hqdefault.jpg`;
	const watchUrl = isTwitch ? `https://www.twitch.tv/${rewatch.videoId}` : `https://www.youtube.com/watch?v=${rewatch.videoId}`;

	return (
		<section aria-labelledby='rewatch-heading' className='overflow-hidden rounded-md border border-border bg-black'>
			{
				// The poster loads directly from the provider's own CDN (i.ytimg.com / jtvnw.net) instead of
				// through our own /_next/image proxy, which shares the page's own origin. Without this hint,
				// the new origin's DNS/TLS handshake lands on the LCP image's critical path — costly under
				// throttling specifically because it's a fresh connection, not because the fetch itself is
				// slow. React hoists <link> into <head> from anywhere.
				priority && <link rel='preconnect' href={isTwitch ? 'https://static-cdn.jtvnw.net' : 'https://i.ytimg.com'} />
			}
			{hasTeams ? (
				<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border p-[0.725rem] sm:gap-6'>
					<TeamMark name={rewatch.teamA} logo={rewatch.teamALogo} align='start' />
					<h2 id='rewatch-heading' className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
						<span className='sr-only'>{label}</span>
						<span aria-hidden>{kicker}</span>
					</h2>
					<TeamMark name={rewatch.teamB} logo={rewatch.teamBLogo} align='end' />
				</div>
			) : (
				<div className='flex items-center justify-between gap-4 border-b border-border p-[0.725rem]'>
					<h2 id='rewatch-heading' className='min-w-0 truncate text-base font-black uppercase tracking-wide text-white sm:text-2xl'>
						{rewatch.title}
					</h2>
					<span className='shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>{kicker}</span>
				</div>
			)}

			<div className='relative aspect-video w-full bg-neutral-950'>
				{playing ? (
					<iframe
						className='absolute inset-0 h-full w-full'
						src={
							isTwitch
								? `https://player.twitch.tv/?channel=${encodeURIComponent(rewatch.videoId)}&parent=${encodeURIComponent(typeof window !== 'undefined' ? window.location.hostname : 'localhost')}&autoplay=true&muted=false`
								: `https://www.youtube-nocookie.com/embed/${rewatch.videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`
						}
						title={label}
						allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
						allowFullScreen
						// YouTube refuses to play (error 153) without a referrer, so don't strip it.
						referrerPolicy={isTwitch ? undefined : 'strict-origin-when-cross-origin'}
					/>
				) : (
					<button type='button' onClick={() => setPlaying(true)} className='group absolute inset-0 block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
						<span className='sr-only'>Play {label}</span>
						<Image
							src={posterSrc}
							alt=''
							fill
							// Not routed through next/image's optimizer (see image-hosts.ts): it's already a
							// small pre-compressed JPEG, and this is frequently the page's LCP element, so a
							// direct fetch from the provider's own CDN beats a round trip through ours.
							unoptimized
							loading={priority ? 'eager' : 'lazy'}
							fetchPriority={priority ? 'high' : undefined}
							className='object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-90'
							draggable={false}
						/>
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
				<span>{isTwitch ? 'Live on Twitch' : 'Recorded broadcast'}</span>
				<a href={watchUrl} target='_blank' rel='noopener noreferrer' className='font-medium underline-offset-4 transition-colors hover:text-white hover:underline'>
					Open on {isTwitch ? 'Twitch' : 'YouTube'}
				</a>
			</div>
		</section>
	);
}
