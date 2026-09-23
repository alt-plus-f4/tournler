'use client';

import Image from 'next/image';

interface CustomImageRendererProps {
	data: { file?: { url?: string }; caption?: string };
}

// Same check as isBlobUrl in @/lib/blob, inlined so the Blob SDK stays out of the client bundle.
function isBlobUrl(url: string) {
	try {
		return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
	} catch {
		return false;
	}
}

function stripTags(html: string) {
	return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function CustomImageRenderer({ data }: CustomImageRendererProps) {
	const src = data.file?.url;
	if (!src || !isBlobUrl(src)) return null;
	const caption = data.caption ? stripTags(data.caption).trim() : '';

	return (
		<figure className='not-prose my-6'>
			<div className='relative min-h-[15rem] w-full overflow-hidden rounded-md border border-border bg-neutral-950'>
				<Image alt={caption || ''} className='object-contain' fill sizes='(max-width: 768px) 100vw, 720px' src={src} />
			</div>
			{caption && <figcaption className='mt-2 text-sm text-muted-foreground'>{caption}</figcaption>}
		</figure>
	);
}

export default CustomImageRenderer;
