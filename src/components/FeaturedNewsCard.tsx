import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/helpers/format-date';

interface FeaturedTournamentCardProps {
	id: number;
	name: string;
	startDate: string;
	bannerUrl: string;
	prizePool: number;
	location: string;
}

export function FeaturedNewsCard({
	id,
	name,
	startDate,
	bannerUrl,
	prizePool,
	location,
}: FeaturedTournamentCardProps) {
	return (
		<Link href={`/tournaments/${id}`}>
			<div className='overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-lg hover:scale-[1.02]'>
				<div className='relative h-32 w-full'>
					<Image
						src={bannerUrl}
						alt={name}
						fill
						sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
						className='object-cover'
						placeholder='blur' // or "empty"
						blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
					/>
				</div>
				<div className='p-4 space-y-2'>
					<h3 className='font-semibold text-lg line-clamp-1'>
						{name}
					</h3>
					<div className='flex justify-between items-center text-sm text-muted-foreground'>
						<span>{formatDate(startDate)}</span>
						<span>${prizePool}</span>
					</div>
					<div className='flex items-center justify-between'>
						<span className='text-sm text-muted-foreground'>
							{location}
						</span>
						<span className='text-sm font-medium hover:underline'>
							Read more
						</span>
					</div>
				</div>
			</div>
		</Link>
	);
}
