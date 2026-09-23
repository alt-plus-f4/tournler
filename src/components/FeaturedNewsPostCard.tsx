import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/helpers/format-date';

const FALLBACK_IMAGE = '/info-image.png';

interface FeaturedNewsPostCardProps {
	title: string;
	blurb: string;
	imageUrl: string | null;
	link: string | null;
	publishedAt: string;
}

const LINK_CLASS = 'group block rounded-md transition-transform duration-200 motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function FeaturedNewsPostCard({ title, blurb, imageUrl, link, publishedAt }: FeaturedNewsPostCardProps) {
	const isExternal = !!link && /^https?:\/\//.test(link);
	const content = (
		<div className={`overflow-hidden rounded-md border border-border bg-card transition-colors ${link ? 'group-hover:border-neutral-500' : ''}`}>
			<div className='relative h-32 w-full'>
				<Image src={imageUrl || FALLBACK_IMAGE} alt='' fill sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' className='object-cover' />
			</div>
			<div className='p-4 space-y-2'>
				<h3 className='font-semibold text-lg line-clamp-1'>{title}</h3>
				<div className='prose prose-sm prose-invert max-w-none line-clamp-2 text-muted-foreground [&_*]:text-inherit' dangerouslySetInnerHTML={{ __html: blurb }} />
				<div className='flex items-center justify-between'>
					<span className='text-sm text-muted-foreground'>{formatDate(publishedAt)}</span>
					{isExternal && <span className='sr-only'>(opens in a new tab)</span>}
				</div>
			</div>
		</div>
	);

	if (!link) return content;

	if (isExternal) {
		return (
			<a href={link} target='_blank' rel='noopener noreferrer' className={LINK_CLASS}>
				{content}
			</a>
		);
	}

	return (
		<Link href={link} className={LINK_CLASS}>
			{content}
		</Link>
	);
}
