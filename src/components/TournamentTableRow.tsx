import { Tournament } from '@/types/types';

interface TournamentTableRowProps {
	tournament: Tournament;
	onEdit: (tournament: Tournament) => void;
}

export function TournamentTableRow({
	tournament,
	onEdit,
}: TournamentTableRowProps) {
	return (
		<tr
			key={tournament.id}
			onClick={() => onEdit(tournament)}
			className='cursor-pointer hover:opacity-80 transition-colors text-xs md:text-sm'
		>
			<td className='py-2 px-4 border'>{tournament.id}</td>
			<td className='py-2 px-4 border'>
				<div className='truncate' title={tournament.name}>
					{tournament.name}
				</div>
			</td>
			<td className='py-2 px-4 border'>{tournament.prizePool}</td>
			<td className='py-2 px-4 border'>{tournament.teamCapacity}</td>
			<td className='py-2 px-4 border'>
				<div className='truncate' title={tournament.location}>
					{tournament.location}
				</div>
			</td>
			<td className='py-2 px-4 border'>
				<div className='truncate' title={tournament.startDate}>
					{new Date(tournament.startDate).toLocaleDateString()}
				</div>
			</td>
			<td className='py-2 px-4 border'>
				<div className='truncate' title={tournament.endDate}>
					{new Date(tournament.endDate).toLocaleDateString()}
				</div>
			</td>
			<td className='py-2 px-4 border'>{tournament.status}</td>
			<td className='py-2 px-4 border'>{tournament.type}</td>
		</tr>
	);
}
