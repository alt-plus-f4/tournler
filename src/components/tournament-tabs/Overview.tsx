import type { ReactNode } from 'react';
import { Calendar, CircleDot, Gamepad2, Layers, Map as MapIcon, MapPin, Swords, Trophy, Wifi } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDate } from '@/lib/helpers/format-date';
import { formatMoney } from '@/lib/helpers/format-money';
import { FORMAT_LABEL, STATUS_LABEL, TYPE_LABEL, type Champion, type TournamentDetail } from './types';

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<div className='flex w-full items-center p-2 sm:w-1/2 lg:w-1/3'>
			<span className='mr-4 shrink-0 text-white' aria-hidden>
				{icon}
			</span>
			<div className='min-w-0'>
				<dt className='text-xs uppercase text-muted-foreground'>{label}</dt>
				<dd className='text-white'>{children}</dd>
			</div>
		</div>
	);
}

const ICON = 'h-8 w-8';

/** The original circular fill gauge for registered teams. */
function CapacityRing({ count, capacity }: { count: number; capacity: number }) {
	const pct = capacity > 0 ? Math.min((count / capacity) * 100, 100) : 0;
	return (
		<div className='relative mr-4 h-12 w-12 shrink-0' aria-hidden>
			<svg className='absolute inset-0' viewBox='0 0 36 36'>
				<path className='text-white opacity-25' d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831' fill='none' stroke='currentColor' strokeWidth='1' />
				<path className='text-white' d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831' fill='none' stroke='currentColor' strokeWidth='1' strokeDasharray={`${pct}, 100`} />
			</svg>
			<Gamepad2 className='absolute inset-0 m-auto h-6 w-6 text-white' />
		</div>
	);
}

export default function Overview({ tournament, champion, setActiveTab }: { tournament: TournamentDetail; champion: Champion | null; setActiveTab: (tab: string) => void }) {
	const { teams, teamCapacity, prizePool } = tournament;
	const hasPrize = prizePool !== null && prizePool !== undefined;

	return (
		<div className='p-4'>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
				<div className='min-w-0 md:col-span-3'>
					{champion && (
						<section aria-labelledby='champion-heading' className='mt-6 flex items-center gap-4 rounded-md border border-border p-4'>
							<Trophy className='h-8 w-8 shrink-0 text-white' aria-hidden />
							<div className='min-w-0'>
								<h2 id='champion-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
									Champion
								</h2>
								<p className='truncate text-2xl font-black uppercase tracking-wide text-white'>{champion.name}</p>
							</div>
						</section>
					)}

					{tournament.description && <div className='prose prose-sm prose-invert ml-1 mt-6 max-w-none' dangerouslySetInnerHTML={{ __html: tournament.description }} />}

					<section aria-labelledby='details-heading'>
						<h2 id='details-heading' className='mb-2 ml-1 mt-6 text-2xl font-bold'>
							Details
						</h2>
						<dl className='flex flex-wrap gap-y-4'>
							<Detail icon={<Calendar className={ICON} />} label='Date'>
								<time dateTime={tournament.startDate}>{formatDate(tournament.startDate)}</time>
							</Detail>
							<Detail icon={<MapPin className={ICON} />} label='Location'>
								{tournament.location}
							</Detail>
							<Detail icon={<Gamepad2 className={ICON} />} label='Game'>
								CS2
							</Detail>
							<Detail icon={<Wifi className={ICON} />} label='Type'>
								{TYPE_LABEL[tournament.type]}
							</Detail>
							<Detail icon={<CircleDot className={ICON} />} label='Status'>
								{STATUS_LABEL[tournament.status]}
							</Detail>
							<Detail icon={<Swords className={ICON} />} label='Format'>
								{FORMAT_LABEL[tournament.format]}
							</Detail>
							<Detail icon={<Layers className={ICON} />} label='Series'>
								Best of {tournament.bestOf}
							</Detail>
							{tournament.mapPool.length > 0 && (
								<Detail icon={<MapIcon className={ICON} />} label='Map pool'>
									{tournament.mapPool.join(', ')}
								</Detail>
							)}
						</dl>
					</section>

					<button
						type='button'
						onClick={() => setActiveTab('bracket')}
						className='group relative mt-10 flex w-full items-center gap-4 rounded-md border border-border p-4 text-left transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					>
						<svg viewBox='0 0 100 60' className='h-16 w-24 shrink-0 text-muted-foreground transition-colors group-hover:text-white' aria-hidden>
							<path d='M 10 10 H 30 V 25 H 50 V 35 H 30 V 50 H 10' stroke='currentColor' strokeWidth='2' fill='none' />
							<rect x='5' y='5' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
							<rect x='5' y='45' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
							<rect x='45' y='25' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
						</svg>
						<span className='flex min-w-0 flex-col'>
							<span className='mb-1 text-lg font-bold'>{tournament.format === 'ROUND_ROBIN' ? 'Tournament Standings' : 'Tournament Bracket'}</span>
							<span className='text-sm text-muted-foreground'>{tournament.status === 'UPCOMING' ? 'Generated from the registered teams when the tournament starts' : 'View the full bracket and results'}</span>
						</span>
						<span aria-hidden className='ml-auto text-muted-foreground transition-transform duration-300 group-hover:text-white motion-safe:group-hover:translate-x-2'>
							→
						</span>
					</button>
				</div>

				<div className='min-w-0 md:col-span-2'>
					<section aria-labelledby='overview-participants-heading'>
						<div className='ml-1 mt-6 flex items-center justify-between gap-4'>
							<h2 id='overview-participants-heading' className='text-2xl font-bold'>
								Participants
							</h2>
							<Button variant='ghost' className='px-6 uppercase' onClick={() => setActiveTab('participants')}>
								View all
							</Button>
						</div>
						<div className='mt-2 flex items-center rounded-md border border-border p-3'>
							<CapacityRing count={teams.length} capacity={teamCapacity} />
							<p className='font-mono text-sm font-bold tabular-nums text-white'>
								{teams.length} /<span className='font-normal text-muted-foreground'> {teamCapacity} teams</span>
							</p>
						</div>
					</section>

					<section aria-labelledby='prize-heading'>
						<div className='ml-1 mt-6 flex items-center justify-between gap-4'>
							<h2 id='prize-heading' className='text-2xl font-bold'>
								Prize Pool
							</h2>
							<Button variant='ghost' className='px-6 uppercase' onClick={() => setActiveTab('prizes')}>
								View all
							</Button>
						</div>
						<div className='mt-2 rounded-md border border-border p-4'>
							{hasPrize ? (
								<div className='flex items-baseline justify-between gap-4 p-2'>
									<p className='text-sm text-muted-foreground'>Total</p>
									<p className='font-mono text-xl font-bold tabular-nums text-white'>{formatMoney(prizePool)}</p>
								</div>
							) : (
								<p className='p-2 text-sm text-muted-foreground'>No prize pool announced.</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
