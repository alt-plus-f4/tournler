'use client';

const ALLOWED_HOSTS = new Set(['www.youtube.com', 'player.twitch.tv', 'player.vimeo.com', 'platform.twitter.com']);

interface CustomEmbedRendererProps {
	data: { embed?: string; service?: string; caption?: string };
}

function CustomEmbedRenderer({ data }: CustomEmbedRendererProps) {
	if (!data.embed) return null;
	let url: URL;
	try {
		url = new URL(data.embed);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return null;
	// Twitch refuses to play without the embedding site's hostname.
	if (url.hostname === 'player.twitch.tv' && typeof window !== 'undefined') url.searchParams.set('parent', window.location.hostname);

	const caption = data.caption?.replace(/<[^>]*>/g, '').trim();
	const isTweet = url.hostname === 'platform.twitter.com';

	return (
		<figure className='not-prose my-6'>
			<div className={isTweet ? 'h-[520px] w-full max-w-[550px]' : 'aspect-video w-full overflow-hidden rounded-md border border-border bg-black'}>
				<iframe
					src={url.toString()}
					title={caption || `${data.service ?? 'Embedded'} content`}
					className='h-full w-full'
					allow='autoplay; encrypted-media; fullscreen; picture-in-picture'
					allowFullScreen
					loading='lazy'
					sandbox='allow-scripts allow-same-origin allow-popups allow-presentation'
				/>
			</div>
			{caption && <figcaption className='mt-2 text-sm text-muted-foreground'>{caption}</figcaption>}
		</figure>
	);
}

export default CustomEmbedRenderer;
