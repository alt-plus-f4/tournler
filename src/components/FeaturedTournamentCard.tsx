import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/helpers/format-date';
import { formatMoney } from '@/lib/helpers/format-money';

interface FeaturedTournamentCardProps {
	id: number;
	name: string;
	startDate: string;
	bannerUrl: string;
	prizePool: number | null;
	location: string;
}

export function FeaturedTournamentCard({ id, name, startDate, bannerUrl, prizePool, location }: FeaturedTournamentCardProps) {
	return (
		<Link
			href={`/tournaments/${id}`}
			className='group block overflow-hidden rounded-md border border-border bg-card transition-[transform,border-color] duration-200 hover:border-neutral-500 motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
		>
			<div className='relative h-32 w-full bg-neutral-900'>
				<Image
					src={bannerUrl}
					alt=''
					fill
					sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
					className='object-cover'
					placeholder='blur'
					blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
				/>
			</div>
			<div className='space-y-2 p-4'>
				<h3 className='line-clamp-1 text-lg font-black uppercase tracking-wide'>{name}</h3>
				<div className='flex items-center justify-between gap-2 text-sm text-muted-foreground'>
					<span>{formatDate(startDate)}</span>
					{prizePool !== null && prizePool !== undefined && <span className='font-mono tabular-nums text-white'>{formatMoney(prizePool)}</span>}
				</div>
				<p className='truncate text-sm text-muted-foreground'>{location}</p>
			</div>
		</Link>
	);
}
