'use client';

interface CustomLinkRendererProps {
	data: { link?: string; meta?: { title?: string; description?: string; site_name?: string; image?: { url?: string } } };
}

function decode(text?: string) {
	return (text ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function CustomLinkRenderer({ data }: CustomLinkRendererProps) {
	if (!data.link || !/^https?:\/\//.test(data.link)) return null;
	let host = '';
	try {
		host = new URL(data.link).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
	const title = decode(data.meta?.title) || data.link;
	const description = decode(data.meta?.description);
	const image = data.meta?.image?.url;

	return (
		<a
			href={data.link}
			target='_blank'
			rel='noopener noreferrer nofollow'
			className='not-prose my-6 flex items-stretch gap-4 overflow-hidden rounded-md border border-border bg-card p-4 no-underline transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
		>
			<div className='min-w-0 flex-1'>
				<p className='line-clamp-2 font-bold text-foreground'>{title}</p>
				{description && <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>{description}</p>}
				<p className='mt-2 font-mono text-xs text-muted-foreground'>{host}</p>
			</div>
			{image && /^https?:\/\//.test(image) && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={image} alt='' loading='lazy' referrerPolicy='no-referrer' className='hidden h-20 w-32 shrink-0 rounded-sm object-cover sm:block' />
			)}
			<span className='sr-only'>(opens in a new tab)</span>
		</a>
	);
}

export default CustomLinkRenderer;
