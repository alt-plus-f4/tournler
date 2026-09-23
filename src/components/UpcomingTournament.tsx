import { formatMoney } from '@/lib/helpers/format-money';
import { getStartLabel } from '@/components/tournament-tabs/schedule';
import Image from 'next/image';
import Link from 'next/link';

interface UpcomingTournamentProps {
	id: number;
	name: string;
	bannerUrl: string | null;
	startDate: string;
	prizePool: number | null;
	teams: unknown[];
	location: string;
	teamCapacity: number;
	/** UPCOMING / ONGOING / COMPLETED. Lets the card say "In progress" or "Start pending" honestly. */
	status?: string;
	isHomePage?: boolean;
}

/**
 * The compact tournament card (home sidebar, /tournaments second row). Sized by its content
 * with a floor height, never a fixed one: a fixed height used to clip the stat captions.
 */
export function UpcomingTournament({ id, name, startDate, bannerUrl, prizePool, teams, location, teamCapacity, status, isHomePage }: UpcomingTournamentProps) {
	const hasPrize = prizePool !== null && prizePool !== undefined;
	const start = getStartLabel(startDate, status);

	return (
		<Link
			href={`/tournaments/${id}`}
			className={`group relative flex w-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-black transition-[transform,border-color] duration-200 hover:border-neutral-500 motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isHomePage ? 'min-h-[200px]' : 'min-h-[156px]'}`}
		>
			<div className={`relative w-full shrink-0 bg-neutral-900 ${isHomePage ? 'h-24' : 'h-20'}`}>
				{bannerUrl && (
					<Image
						src={bannerUrl}
						alt=''
						fill
						sizes='(max-width: 640px) 100vw, 440px'
						className='object-cover'
						placeholder='blur'
						blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
					/>
				)}
				<div aria-hidden className='absolute bottom-0 left-0 h-5 w-full bg-gradient-to-t from-black to-transparent' />
			</div>
			<div className='flex flex-1 flex-col text-center'>
				<h3 className='mx-3 mt-2 truncate text-base font-black uppercase tracking-wide text-white'>{name}</h3>
				<p className='mx-3 mb-2 truncate text-xs text-muted-foreground'>{location}</p>
				<dl className='mt-auto grid auto-cols-fr grid-flow-col items-start gap-1 border-t border-border px-1 py-2'>
					<div className='flex min-w-0 flex-col-reverse'>
						<dt className='truncate text-xs text-muted-foreground'>{start.label}</dt>
						<dd className='truncate text-xs font-bold text-white lg:text-sm'>{start.value}</dd>
					</div>
					{hasPrize && (
						<div className='flex min-w-0 flex-col-reverse'>
							<dt className='text-xs text-muted-foreground'>Prize pool</dt>
							<dd className='truncate font-mono text-xs font-bold tabular-nums text-white lg:text-sm'>{formatMoney(prizePool)}</dd>
						</div>
					)}
					<div className='flex min-w-0 flex-col-reverse'>
						<dt className='text-xs text-muted-foreground'>Teams</dt>
						<dd className='font-mono text-xs font-bold tabular-nums text-white lg:text-sm'>
							{teams.length}/{teamCapacity}
						</dd>
					</div>
				</dl>
			</div>
		</Link>
	);
}
