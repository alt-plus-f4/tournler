import { Button } from './ui/button';

interface TournamentTableProps {
	tournaments: any[];
	totalPages: number;
	page: number;
	onPageChange: (page: number) => void;
	onEdit: (tournament: any) => void;
}

export function TournamentTable({
	tournaments,
	totalPages,
	page,
	onPageChange,
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
				<tbody>
					{tournaments &&
						tournaments.map((tour) => (
							<tr
								key={tour.id}
								onClick={() => onEdit(tour)}
								className='cursor-pointer hover:opacity-80 transition-colors'
							>
								<td className='py-2 px-4 border'>{tour.id}</td>
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
			</table>
			<div className='mt-4 flex justify-center gap-2'>
				<Button
					onClick={() => onPageChange(page - 1)}
					disabled={page === 1}
				>
					&lt;
				</Button>
				<span className='py-2 px-4 border bg-muted text-white'>
					{page}
				</span>
				<Button
					onClick={() => onPageChange(page + 1)}
					disabled={page === totalPages}
				>
					&gt;
				</Button>
			</div>
		</>
	);
}

export function TournamentTableSkeleton() {
	return (
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
		</table>
	);
}
