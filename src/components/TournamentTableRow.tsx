import { formatMoney } from '@/lib/helpers/format-money';
import { Tournament } from '@/types/types';

interface TournamentTableRowProps {
	tournament: Tournament;
	onEdit: (tournament: Tournament) => void;
}

const CELL = 'py-2 px-4 border border-border';

export function TournamentTableRow({ tournament, onEdit }: TournamentTableRowProps) {
	return (
		<tr className='text-xs md:text-sm transition-colors hover:bg-neutral-950'>
			<td className={`${CELL} font-mono tabular-nums text-muted-foreground`}>{tournament.id}</td>
			<td className={CELL}>
				<button
					type='button'
					onClick={() => onEdit(tournament)}
					title={tournament.name}
					className='block max-w-full truncate rounded-sm text-left font-medium text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
				>
					<span className='sr-only'>Edit </span>
					{tournament.name}
				</button>
			</td>
			<td className={`${CELL} font-mono tabular-nums`}>{tournament.prizePool !== null && tournament.prizePool !== undefined ? formatMoney(tournament.prizePool) : '—'}</td>
			<td className={`${CELL} font-mono tabular-nums`}>{tournament.teamCapacity}</td>
			<td className={CELL}>
				<div className='truncate' title={tournament.location}>
					{tournament.location}
				</div>
			</td>
			<td className={CELL}>
				<div className='truncate font-mono tabular-nums' title={tournament.startDate}>
					{new Date(tournament.startDate).toLocaleDateString()}
				</div>
			</td>
			<td className={CELL}>
				<div className='truncate font-mono tabular-nums' title={tournament.endDate}>
					{new Date(tournament.endDate).toLocaleDateString()}
				</div>
			</td>
			<td className={CELL}>{tournament.status}</td>
			<td className={CELL}>{tournament.type}</td>
		</tr>
	);
}
