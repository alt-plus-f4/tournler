import Image from 'next/image';
import Link from 'next/link';
import { getStartLabel } from '@/components/tournament-tabs/schedule';
import { formatMoney } from '@/lib/helpers/format-money';
import { GameTag } from '@/components/games/GameMark';

interface FeaturedTournamentCardProps {
	id: number;
	name: string;
	startDate: string;
	bannerUrl: string;
	prizePool: number | null;
	location: string;
	/** UPCOMING / ONGOING / COMPLETED; without it a past start date reads "Start pending". */
	status?: string;
	game?: 'CS2' | 'LOL';
}

export function FeaturedTournamentCard({ id, name, startDate, bannerUrl, prizePool, location, status, game = 'CS2' }: FeaturedTournamentCardProps) {
	const start = getStartLabel(startDate, status);
	return (
		<Link
			href={`/tournaments/${id}`}
			className='group block overflow-hidden rounded-md border border-border bg-card transition-[transform,border-color] duration-200 hover:border-neutral-500 motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
		>
			<div className='relative h-32 w-full bg-neutral-900'>
				<GameTag game={game} className='absolute right-2 top-2 z-10 bg-black/70' />
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
					<span className='min-w-0 truncate'>
						<span className={start.pending ? 'text-white' : undefined}>{start.value}</span>
						{start.pending && <span> · {start.label}</span>}
					</span>
					{prizePool !== null && prizePool !== undefined && <span className='shrink-0 font-mono tabular-nums text-white'>{formatMoney(prizePool)}</span>}
				</div>
				<p className='truncate text-sm text-muted-foreground'>{location}</p>
			</div>
		</Link>
	);
}
