'use client';

import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { parseStreamUrl } from './stream-url';

/**
 * A live match's stream on the homepage. YouTube/Twitch links get a click-to-play embed (nothing
 * loads from the provider until the viewer asks); any other link is just an outbound link.
 */
export function LiveStream({ streamUrl, label }: { streamUrl: string; label: string }) {
	const [playing, setPlaying] = useState(false);
	const embed = parseStreamUrl(streamUrl);

	if (!embed) {
		return (
			<div className='border-t border-border px-4 py-3 sm:px-6'>
				<a href={streamUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:underline'>
					<Play className='h-4 w-4 fill-current' aria-hidden />
					Watch the stream
					<ExternalLink className='h-3.5 w-3.5 text-muted-foreground' aria-hidden />
				</a>
			</div>
		);
	}

	const isTwitch = embed.provider === 'twitch';
	const providerName = isTwitch ? 'Twitch' : 'YouTube';

	return (
		<div className='border-t border-border'>
			<div className='relative aspect-video w-full bg-neutral-950'>
				{playing ? (
					<iframe
						className='absolute inset-0 h-full w-full'
						src={
							isTwitch
								? `https://player.twitch.tv/?channel=${encodeURIComponent(embed.id)}&parent=${encodeURIComponent(window.location.hostname)}&autoplay=true&muted=false`
								: `https://www.youtube-nocookie.com/embed/${embed.id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`
						}
						title={`Live stream: ${label}`}
						allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
						allowFullScreen
						referrerPolicy={isTwitch ? undefined : 'strict-origin-when-cross-origin'}
					/>
				) : (
					<button
						type='button'
						onClick={() => setPlaying(true)}
						className='group absolute inset-0 flex flex-col items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
					>
						<span className='flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out motion-safe:group-hover:scale-110 sm:h-20 sm:w-20'>
							<Play className='ml-1 h-6 w-6 fill-current sm:h-8 sm:w-8' aria-hidden />
						</span>
						<span className='text-sm font-medium text-white'>
							Watch live <span className='sr-only'>— {label}</span>
						</span>
					</button>
				)}
			</div>
			<div className='flex items-center justify-between gap-4 px-4 py-2.5 text-xs text-muted-foreground sm:px-6'>
				<span>Live on {providerName}</span>
				<a href={streamUrl} target='_blank' rel='noopener noreferrer' className='font-medium underline-offset-4 transition-colors hover:text-white hover:underline'>
					Open on {providerName}
				</a>
			</div>
		</div>
	);
}
