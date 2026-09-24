import Link from 'next/link';
import { formatMoney } from '@/lib/helpers/format-money';
import { cn } from '@/lib/utils';
import type { Tournament } from '@/types/types';
import { GameTag } from '@/components/games/GameMark';

interface TournamentTableProps {
	tournaments: Tournament[];
	onEdit: (tournament: Tournament) => void;
	isLoading?: boolean;
	/** Shown when the table is empty (e.g. no match for the current search/filter). */
	emptyMessage?: string;
}

const FORMAT_LABELS: Record<string, string> = {
	SINGLE_ELIMINATION: 'Single elim',
	DOUBLE_ELIMINATION: 'Double elim',
	ROUND_ROBIN: 'Round robin',
};

const COLUMN_COUNT = 8;

const th = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap';
const td = 'px-3 py-2 align-middle';

export function TournamentStatus({ status }: { status: string }) {
	if (status === 'ONGOING') {
		return (
			<span className='inline-flex items-center gap-1.5 text-foreground'>
				<span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-live' />
				Ongoing
			</span>
		);
	}
	return <span className={cn(status === 'COMPLETED' ? 'text-muted-foreground' : 'text-foreground')}>{status === 'COMPLETED' ? 'Completed' : 'Upcoming'}</span>;
}

function formatDate(value: Date | string) {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function TournamentTable({ isLoading, tournaments, onEdit, emptyMessage = 'No tournaments found.' }: TournamentTableProps) {
	return (
		<div className='overflow-x-auto rounded-md border border-border'>
			<table className='w-full text-sm'>
				<thead className='border-b border-border'>
					<tr>
						<th scope='col' className={th}>
							Game
						</th>
						<th scope='col' className={th}>
							Name
						</th>
						<th scope='col' className={th}>
							Status
						</th>
						<th scope='col' className={th}>
							Format
						</th>
						<th scope='col' className={th}>
							Starts
						</th>
						<th scope='col' className={cn(th, 'text-right')}>
							Teams
						</th>
						<th scope='col' className={cn(th, 'text-right')}>
							Prize
						</th>
						<th scope='col' className={cn(th, 'text-right')}>
							<span className='sr-only'>Actions</span>
						</th>
					</tr>
				</thead>
				{isLoading ? (
					<TournamentTableSkeleton />
				) : !tournaments || tournaments.length === 0 ? (
					<tbody>
						<tr>
							<td colSpan={COLUMN_COUNT} className='px-4 py-8 text-center text-muted-foreground'>
								{emptyMessage}
							</td>
						</tr>
					</tbody>
				) : (
					<tbody className='divide-y divide-border'>
						{tournaments.map((tour) => (
							<tr key={tour.id} className='hover:bg-muted/50'>
								<td className={cn(td, 'w-0')}>
									<GameTag game={tour.game ?? 'CS2'} />
								</td>
								<td className={td}>
									<button
										type='button'
										onClick={() => onEdit(tour)}
										className='max-w-[28ch] truncate rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
										aria-label={`Edit ${tour.name}`}
									>
										{tour.name}
									</button>
								</td>
								<td className={cn(td, 'whitespace-nowrap')}>
									<TournamentStatus status={tour.status} />
								</td>
								<td className={cn(td, 'whitespace-nowrap text-neutral-300')}>{FORMAT_LABELS[tour.format] ?? tour.format}</td>
								<td className={cn(td, 'whitespace-nowrap font-mono tabular-nums text-neutral-300')}>{formatDate(tour.startDate)}</td>
								<td className={cn(td, 'whitespace-nowrap text-right font-mono tabular-nums')}>
									{tour.teams?.length ?? 0}/{tour.teamCapacity}
								</td>
								<td className={cn(td, 'whitespace-nowrap text-right font-mono tabular-nums')}>{tour.prizePool ? formatMoney(tour.prizePool) : <span className='text-muted-foreground'>—</span>}</td>
								<td className={cn(td, 'whitespace-nowrap text-right')}>
									<Link href={`/tournaments/${tour.id}`} className='rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
										View<span className='sr-only'> {tour.name} public page</span>
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				)}
			</table>
		</div>
	);
}

export function TournamentTableSkeleton() {
	return (
		<tbody aria-hidden>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i} className='border-b border-border last:border-0'>
					{Array.from({ length: COLUMN_COUNT }).map((_, j) => (
						<td key={j} className={td}>
							<div className='h-4 rounded-sm bg-muted' />
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
