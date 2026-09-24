import { formatMoney } from '@/lib/helpers/format-money';
import { ReducedTournament } from '@/types/types';
import { getStartLabel } from '@/components/tournament-tabs/schedule';
import Image from 'next/image';
import Link from 'next/link';

export function FeaturedTournament({ id, name, startDate, bannerUrl, prizePool, teams, location, teamCapacity, status }: ReducedTournament & { status?: string }) {
	const hasPrize = prizePool !== null && prizePool !== undefined;
	const start = getStartLabel(startDate, status);

	return (
		<Link
			href={`/tournaments/${id}`}
			className='group relative flex flex-col overflow-hidden rounded-md border border-border transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
		>
			<div className='relative h-48 w-full bg-neutral-900 sm:h-64'>
				{bannerUrl && <Image src={bannerUrl} alt='' fill sizes='(max-width: 1400px) 100vw, 1400px' preload className='object-cover transition-[filter] duration-200 group-hover:brightness-110' />}
				<div aria-hidden className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent' />
				<div className='absolute inset-x-4 bottom-3 flex items-end'>
					<h2 className='text-balance text-2xl font-black uppercase tracking-wide text-white sm:text-4xl'>{name}</h2>
				</div>
			</div>
			<dl className='grid w-full grid-cols-2 gap-y-2 border-t border-border bg-black p-2 text-center sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none'>
				<div className='flex flex-col-reverse sm:border-r sm:border-border'>
					<dt className='text-xs text-muted-foreground md:text-sm'>{start.label}</dt>
					<dd className='text-sm font-bold md:text-base'>{start.value}</dd>
				</div>
				{hasPrize && (
					<div className='flex flex-col-reverse sm:border-r sm:border-border'>
						<dt className='text-xs text-muted-foreground md:text-sm'>Prize pool</dt>
						<dd className='font-mono text-sm font-bold tabular-nums md:text-base'>{formatMoney(prizePool)}</dd>
					</div>
				)}
				<div className='flex flex-col-reverse sm:border-r sm:border-border'>
					<dt className='text-xs text-muted-foreground md:text-sm'>Location</dt>
					<dd className='truncate px-1 text-sm font-bold md:text-base'>{location}</dd>
				</div>
				<div className='flex flex-col-reverse'>
					<dt className='text-xs text-muted-foreground md:text-sm'>Teams</dt>
					<dd className='font-mono text-sm font-bold tabular-nums md:text-base'>
						{teams.length}/{teamCapacity}
					</dd>
				</div>
			</dl>
		</Link>
	);
}
