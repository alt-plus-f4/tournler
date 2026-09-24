import Link from 'next/link';
import { Match } from '@/types/types';
import { adminTable as t, formatAdminDate } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';
import { GameTag } from '@/components/games/GameMark';

interface MatchTableProps {
	matches: Match[];
	onEdit: (match: Match) => void;
	isLoading?: boolean;
	emptyMessage?: string;
}

const HEADERS = ['Game', 'Match', 'Tournament', 'Round', 'Status', 'Score', 'Date'];

export function MatchStatusLabel({ status }: { status: string }) {
	if (status === 'LIVE') {
		return (
			<span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
				<span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-live' />
				Live
			</span>
		);
	}
	if (status === 'PAUSED') {
		return (
			<span className='inline-flex items-center gap-1.5 text-foreground'>
				<span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-hold' />
				Paused
			</span>
		);
	}
	return <span className={status === 'COMPLETED' ? 'text-muted-foreground' : 'text-neutral-300'}>{status === 'COMPLETED' ? 'Completed' : 'Scheduled'}</span>;
}

export function MatchTable({ isLoading, matches, onEdit, emptyMessage = 'No matches found.' }: MatchTableProps) {
	return (
		<div className={t.wrapper}>
			<table className={t.table}>
				<thead className={t.thead}>
					<tr>
						{HEADERS.map((h) => (
							<th key={h} scope='col' className={cn(t.th, (h === 'Score' || h === 'Round') && 'text-right')}>
								{h}
							</th>
						))}
						<th scope='col' className={t.th}>
							<span className='sr-only'>Actions</span>
						</th>
					</tr>
				</thead>
				{isLoading ? (
					<MatchTableSkeleton />
				) : !matches || matches.length === 0 ? (
					<tbody>
						<tr>
							<td colSpan={HEADERS.length + 1} className={t.empty}>
								{emptyMessage}
							</td>
						</tr>
					</tbody>
				) : (
					<tbody className={t.tbody}>
						{matches.map((match) => {
							const label = `${match.teamA?.name ?? 'TBD'} vs ${match.teamB?.name ?? 'TBD'}`;
							return (
								<tr key={match.id} className={t.tr}>
									<td className={cn(t.td, 'w-0')}>
										<GameTag game={match.tournament?.game ?? 'CS2'} />
									</td>
									<td className={t.td}>
										<button type='button' onClick={() => onEdit(match)} className={t.rowAction} aria-label={`Edit match ${label}`}>
											{label}
										</button>
									</td>
									<td className={cn(t.td, 'max-w-[24ch] truncate text-neutral-300')}>{match.tournament?.name ?? '—'}</td>
									<td className={cn(t.td, t.num, 'text-right')}>{match.round}</td>
									<td className={cn(t.td, 'whitespace-nowrap')}>
										<MatchStatusLabel status={match.status} />
									</td>
									<td className={cn(t.td, t.num, 'whitespace-nowrap text-right')}>
										{match.scoreTeamA ?? '–'} : {match.scoreTeamB ?? '–'}
									</td>
									<td className={cn(t.td, t.num, 'whitespace-nowrap text-neutral-300')}>{formatAdminDate(match.matchDate, true)}</td>
									<td className={cn(t.td, 'whitespace-nowrap text-right')}>
										<Link href={`/matches/${match.id}`} className='rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
											View<span className='sr-only'> match {label}</span>
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				)}
			</table>
		</div>
	);
}

export function MatchTableSkeleton() {
	return (
		<tbody aria-hidden>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i} className='border-b border-border last:border-0'>
					{Array.from({ length: HEADERS.length + 1 }).map((_, j) => (
						<td key={j} className={t.td}>
							<div className='h-4 rounded-sm bg-muted' />
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
