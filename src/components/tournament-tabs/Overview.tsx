import type { ReactNode } from 'react';
import { Calendar, CircleDot, Gamepad2, Layers, Map as MapIcon, MapPin, Swords, Trophy, Wifi } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDate } from '@/lib/helpers/format-date';
import { formatMoney } from '@/lib/helpers/format-money';
import { FORMAT_LABEL, STATUS_LABEL, TYPE_LABEL, type Champion, type TournamentDetail } from './types';

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<div className='flex items-start gap-3'>
			<span className='mt-0.5 text-muted-foreground' aria-hidden>
				{icon}
			</span>
			<div className='min-w-0'>
				<dt className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>{label}</dt>
				<dd className='mt-0.5 text-sm text-white'>{children}</dd>
			</div>
		</div>
	);
}

const ICON = 'h-5 w-5';

export default function Overview({ tournament, champion, setActiveTab }: { tournament: TournamentDetail; champion: Champion | null; setActiveTab: (tab: string) => void }) {
	const { teams, teamCapacity, prizePool } = tournament;
	const shownTeams = teams.slice(0, 6);

	return (
		<div className='grid grid-cols-1 gap-8 p-4 sm:p-6 md:grid-cols-5'>
			<div className='space-y-8 md:col-span-3'>
				{champion && (
					<section aria-labelledby='champion-heading' className='flex items-center gap-4 rounded-md border border-border p-4'>
						<Trophy className='h-8 w-8 shrink-0 text-white' aria-hidden />
						<div className='min-w-0'>
							<h2 id='champion-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								Champion
							</h2>
							<p className='truncate text-2xl font-black uppercase tracking-wide text-white'>{champion.name}</p>
						</div>
					</section>
				)}

				{tournament.description && (
					<section aria-label='About this tournament'>
						<div className='prose prose-sm prose-invert max-w-prose' dangerouslySetInnerHTML={{ __html: tournament.description }} />
					</section>
				)}

				<section aria-labelledby='details-heading'>
					<h2 id='details-heading' className='mb-4 text-2xl font-bold'>
						Details
					</h2>
					<dl className='grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3'>
						<Detail icon={<Calendar className={ICON} />} label='Starts'>
							<time dateTime={tournament.startDate}>{formatDate(tournament.startDate)}</time>
						</Detail>
						<Detail icon={<Swords className={ICON} />} label='Format'>
							{FORMAT_LABEL[tournament.format]}
						</Detail>
						<Detail icon={<Layers className={ICON} />} label='Series'>
							<span>Best of {tournament.bestOf}</span>
						</Detail>
						<Detail icon={<Gamepad2 className={ICON} />} label='Game'>
							CS2
						</Detail>
						<Detail icon={<Wifi className={ICON} />} label='Type'>
							{TYPE_LABEL[tournament.type]}
						</Detail>
						<Detail icon={<MapPin className={ICON} />} label='Location'>
							{tournament.location}
						</Detail>
						<Detail icon={<CircleDot className={ICON} />} label='Status'>
							{STATUS_LABEL[tournament.status]}
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
					className='group flex w-full items-center gap-4 rounded-md border border-border p-4 text-left transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
				>
					<svg viewBox='0 0 100 60' className='h-12 w-20 shrink-0 text-muted-foreground transition-colors group-hover:text-white' aria-hidden>
						<path d='M 10 10 H 30 V 25 H 50 V 35 H 30 V 50 H 10' stroke='currentColor' strokeWidth='2' fill='none' />
						<rect x='5' y='5' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
						<rect x='5' y='45' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
						<rect x='45' y='25' width='10' height='10' className='fill-neutral-900' stroke='currentColor' />
					</svg>
					<span className='flex flex-col'>
						<span className='text-lg font-bold'>{tournament.format === 'ROUND_ROBIN' ? 'Standings' : 'Bracket'}</span>
						<span className='text-sm text-muted-foreground'>{tournament.status === 'UPCOMING' ? 'Generated from the registered teams when the tournament starts' : 'Results update as the game server reports them'}</span>
					</span>
					<span aria-hidden className='ml-auto text-muted-foreground transition-transform duration-200 group-hover:text-white motion-safe:group-hover:translate-x-1'>
						→
					</span>
				</button>
			</div>

			<div className='space-y-8 md:col-span-2'>
				<section aria-labelledby='overview-participants-heading'>
					<div className='mb-3 flex items-center justify-between gap-4'>
						<h2 id='overview-participants-heading' className='text-2xl font-bold'>
							Participants
						</h2>
						<Button variant='ghost' size='sm' onClick={() => setActiveTab('participants')}>
							View all
						</Button>
					</div>
					<div className='rounded-md border border-border'>
						<p className='border-b border-border px-4 py-3 font-mono text-sm tabular-nums text-muted-foreground'>
							<span className='text-lg font-bold text-white'>{teams.length}</span> / {teamCapacity} teams
						</p>
						{shownTeams.length > 0 ? (
							<ul className='divide-y divide-border'>
								{shownTeams.map((team) => (
									<li key={team.id} className='truncate px-4 py-2 text-sm font-bold uppercase tracking-wide text-white'>
										{team.name}
									</li>
								))}
								{teams.length > shownTeams.length && <li className='px-4 py-2 text-sm text-muted-foreground'>and {teams.length - shownTeams.length} more</li>}
							</ul>
						) : (
							<p className='px-4 py-3 text-sm text-muted-foreground'>No teams registered yet.</p>
						)}
					</div>
				</section>

				<section aria-labelledby='prize-heading'>
					<h2 id='prize-heading' className='mb-3 text-2xl font-bold'>
						Prize pool
					</h2>
					<div className='rounded-md border border-border px-4 py-3'>
						{prizePool !== null && prizePool !== undefined ? (
							<p className='font-mono text-2xl font-bold tabular-nums text-white'>{formatMoney(prizePool)}</p>
						) : (
							<p className='text-sm text-muted-foreground'>No prize pool announced.</p>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
