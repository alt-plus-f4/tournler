interface TeamTableProps {
	teams: any[];
	onEdit: (team: any) => void;
	isLoading?: boolean;
}

export function TeamTable({ isLoading, teams, onEdit }: TeamTableProps) {
	return (
		<div className='overflow-auto h-[70%]'>
			<table className='w-full border'>
				<thead>
					<tr>
						<th className='py-2 px-3 border'>ID</th>
						<th className='py-2 px-12 border'>Name</th>
						<th className='py-2 px-12 border'>Logo</th>
						<th className='py-2 px-12 border'>Captain</th>
						<th className='py-2 px-12 border whitespace-nowrap'>
							Members Count
						</th>
						<th className='py-2 px-12 border whitespace-nowrap'>
							Created At
						</th>
						<th className='py-2 px-12 border whitespace-nowrap'>
							Updated At
						</th>
					</tr>
				</thead>
				{isLoading ? (
					<TeamTableSkeleton />
				) : (
					<tbody>
						{teams &&
							teams.map((team) => (
								<tr
									key={team.id}
									onClick={() => onEdit(team)}
									className='cursor-pointer hover:opacity-80 transition-colors text-center'
								>
									<td className='py-2 px-4 border'>
										{team.id}
									</td>
									<td className='py-2 px-4 border'>
										{team.name}
									</td>
									<td className='py-2 px-4 border'>
										{team.logo ? (
											<a
												href={team.logo}
												target='_blank'
												rel='noopener noreferrer'
												className='text-foregroundgray underline'
											>
												View
											</a>
										) : (
											'-'
										)}
									</td>
									<td className='py-2 px-4 border'>
										{team.capitanId || '-'}
									</td>
									<td className='py-2 px-4 border'>
										{team.members?.length || 0}
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											team.createdAt
										).toLocaleDateString()}
									</td>
									<td className='py-2 px-4 border'>
										{new Date(
											team.updatedAt
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

export function TeamTableSkeleton() {
	return (
		<tbody>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i}>
					{Array.from({ length: 7 }).map((_, j) => (
						<td key={j} className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
