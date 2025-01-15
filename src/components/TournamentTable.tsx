interface TournamentTableProps {
	tournaments: any[];
	onEdit: (tournament: any) => void;
	isLoading?: boolean;
}

export function TournamentTable({
	isLoading,
	tournaments,
	onEdit,
}: TournamentTableProps) {
	return (
		<>
			<table className='w-full border'>
				<thead>
					<tr>
						<th className='py-2 px-4 border'>ID</th>
						<th className='py-2 px-4 border'>Name</th>
						<th className='py-2 px-4 border'>Location</th>
						<th className='py-2 px-4 border'>Prize Pool</th>
						<th className='py-2 px-4 border'>Status</th>
					</tr>
				</thead>
				{isLoading ? (
					<TournamentTableSkeleton />
				) : (
					<tbody>
						{tournaments &&
							tournaments.map((tour) => (
								<tr
									key={tour.id}
									onClick={() => onEdit(tour)}
									className='cursor-pointer hover:opacity-80 transition-colors'
								>
									<td className='py-2 px-4 border'>
										{tour.id}
									</td>
									<td className='py-2 px-4 border'>
										{tour.name}
									</td>
									<td className='py-2 px-4 border'>
										{tour.location}
									</td>
									<td className='py-2 px-4 border'>
										{tour.prizePool}
									</td>
									<td className='py-2 px-4 border'>
										{tour.status}
									</td>
								</tr>
							))}
					</tbody>
				)}
			</table>
		</>
	);
}

export function TournamentTableSkeleton() {
	return (
		<tbody>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i}>
					<td className='py-2 px-4 border'>
						<div className='h-4 bg-muted rounded-sm'></div>
					</td>
					<td className='py-2 px-4 border'>
						<div className='h-4 bg-muted rounded-sm'></div>
					</td>
					<td className='py-2 px-4 border'>
						<div className='h-4 bg-muted rounded-sm'></div>
					</td>
					<td className='py-2 px-4 border'>
						<div className='h-4 bg-muted rounded-sm'></div>
					</td>
					<td className='py-2 px-4 border'>
						<div className='h-4 bg-muted rounded-sm'></div>
					</td>
				</tr>
			))}
		</tbody>
	);
}
