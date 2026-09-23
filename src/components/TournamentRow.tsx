import { formatDate } from '@/lib/helpers/format-date';
import { formatMoney } from '@/lib/helpers/format-money';
import { ReducedTournament } from '@/types/types';
import Image from 'next/image';
import Link from 'next/link';

export function TournamentRow({ id, name, startDate, logoUrl, prizePool, teams, location, teamCapacity }: ReducedTournament) {
	const hasPrize = prizePool !== null && prizePool !== undefined;

	return (
		<Link
			href={`/tournaments/${id}`}
			className='flex w-full flex-col gap-3 rounded-md border border-border p-3 transition-colors hover:border-neutral-500 hover:bg-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center sm:justify-between'
		>
			<div className='flex min-w-0 items-center'>
				<div className='relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-900'>
					{logoUrl ? (
						<Image src={logoUrl} alt='' fill sizes='48px' className='object-cover' />
					) : (
						<span aria-hidden className='text-sm font-bold text-white'>
							{name.substring(0, 2).toUpperCase()}
						</span>
					)}
				</div>
				<div className='ml-4 flex min-w-0 flex-col items-start'>
					<h3 className='truncate text-lg font-black uppercase tracking-wide text-white'>{name}</h3>
					<p className='truncate text-sm text-muted-foreground'>{location}</p>
				</div>
			</div>
			<dl className='grid shrink-0 grid-flow-col auto-cols-fr gap-6 text-center sm:mr-4 sm:gap-12'>
				<div className='flex flex-col-reverse'>
					<dt className='text-xs text-muted-foreground'>Date</dt>
					<dd className='whitespace-nowrap text-sm font-bold'>{formatDate(startDate)}</dd>
				</div>
				{hasPrize && (
					<div className='flex flex-col-reverse'>
						<dt className='text-xs text-muted-foreground'>Prize pool</dt>
						<dd className='font-mono text-sm font-bold tabular-nums'>{formatMoney(prizePool)}</dd>
					</div>
				)}
				<div className='flex flex-col-reverse'>
					<dt className='text-xs text-muted-foreground'>Teams</dt>
					<dd className='font-mono text-sm font-bold tabular-nums'>
						{teams.length}/{teamCapacity}
					</dd>
				</div>
			</dl>
		</Link>
	);
}
