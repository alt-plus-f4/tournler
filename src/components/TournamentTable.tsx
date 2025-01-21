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
		<div className='overflow-auto h-[70%]'>
			<table className='w-full border'>
				<thead>
					<tr>
						<th className='py-2 px-3 border'>ID</th>
						<th className='py-2 px-12 border'>Name</th>
						<th className='py-2 px-12 border'>Location</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Prize Pool</th>
						<th className='py-2 px-10 border'>Status</th>
						<th className='py-2 px-10 border'>Type</th>
						<th className='py-2 px-3 border whitespace-nowrap'>Team Capacity</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Start Date</th>
						<th className='py-2 px-12 border whitespace-nowrap'>End Date</th>
						<th className='py-2 px-12 border'>Organizer</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Banner URL</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Logo URL</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Created At</th>
						<th className='py-2 px-12 border whitespace-nowrap'>Updated At</th>
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
									className='cursor-pointer hover:opacity-80 transition-colors text-center pb-8'
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
										{tour.prizePool || '-'}
									</td>
									<td className='py-2 px-4 border'>
										{tour.status}
									</td>
									<td className='py-2 px-4 border'>
										{tour.type}
									</td>
									<td className='py-2 px-4 border'>
										{tour.teamCapacity}
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											tour.startDate
										).toLocaleDateString()}
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											tour.endDate
										).toLocaleDateString()}
									</td>
									<td className='py-2 px-4 border'>
										{tour.organizerId || '-'}
									</td>
									<td className='py-2 px-4 border'>
										<a
											href={tour.bannerUrl}
											target='_blank'
											rel='noopener noreferrer'
											className='text-foregroundgray underline'
										>
											{tour.bannerUrl ? 'View' : '-'}
										</a>
									</td>
									<td className='py-2 px-4 border'>
										<a
											href={tour.logoUrl}
											target='_blank'
											rel='noopener noreferrer'
											className='text-foregroundgray underline'
										>
											{tour.logoUrl ? 'View' : '-'}
										</a>
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											tour.createdAt
										).toLocaleDateString()}
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											tour.updatedAt
										).toLocaleDateString()}
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
		<tbody>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i}>
					{Array.from({ length: 14 }).map((_, j) => (
						<td key={j} className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
