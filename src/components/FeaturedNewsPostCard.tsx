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

export function FeaturedNewsPostCard({ title, blurb, imageUrl, link, publishedAt }: FeaturedNewsPostCardProps) {
	const content = (
		<div className='overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]'>
			<div className='relative h-32 w-full'>
				<Image src={imageUrl || FALLBACK_IMAGE} alt={title} fill sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' className='object-cover' />
			</div>
			<div className='p-4 space-y-2'>
				<h3 className='font-semibold text-lg line-clamp-1'>{title}</h3>
				<div className='prose prose-sm prose-invert max-w-none line-clamp-2 text-muted-foreground [&_*]:text-inherit' dangerouslySetInnerHTML={{ __html: blurb }} />
				<div className='flex items-center justify-between'>
					<span className='text-sm text-muted-foreground'>{formatDate(publishedAt)}</span>
					{link && <span className='text-sm font-medium hover:underline'>Read more</span>}
				</div>
			</div>
		</div>
	);

	if (!link) return content;

	const isExternal = /^https?:\/\//.test(link);
	if (isExternal) {
		return (
			<a href={link} target='_blank' rel='noopener noreferrer'>
				{content}
			</a>
		);
	}

	return <Link href={link}>{content}</Link>;
}
