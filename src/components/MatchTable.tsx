import { Match } from '@/types/types';

interface MatchTableProps {
	matches: Match[];
	onEdit: (match: Match) => void;
	isLoading?: boolean;
}

export function MatchTable({ isLoading, matches, onEdit }: MatchTableProps) {
	return (
		<div className='overflow-auto h-[70%]'>
			<table className='w-full border'>
				<thead>
					<tr>
						<th className='py-2 px-3 border'>ID</th>
						<th className='py-2 px-4 border'>Tournament</th>
						<th className='py-2 px-4 border'>Team A</th>
						<th className='py-2 px-4 border'>Team B</th>
						<th className='py-2 px-4 border'>Score</th>
						<th className='py-2 px-4 border'>Status</th>
						<th className='py-2 px-4 border'>Round</th>
						<th className='py-2 px-4 border whitespace-nowrap'>Match Date</th>
					</tr>
				</thead>
				{isLoading ? (
					<MatchTableSkeleton />
				) : !matches || matches.length === 0 ? (
					<tbody>
						<tr>
							<td colSpan={8} className='py-8 px-4 border text-center text-muted-foreground'>
								No matches found.
							</td>
						</tr>
					</tbody>
				) : (
					<tbody>
						{matches.map((match) => (
							<tr
								key={match.id}
								onClick={() => onEdit(match)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onEdit(match);
									}
								}}
								tabIndex={0}
								role='button'
								className='cursor-pointer hover:opacity-80 transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset'
							>
								<td className='py-2 px-4 border'>{match.id}</td>
								<td className='py-2 px-4 border'>{match.tournament?.name ?? '-'}</td>
								<td className='py-2 px-4 border'>{match.teamA?.name ?? 'TBD'}</td>
								<td className='py-2 px-4 border'>{match.teamB?.name ?? 'TBD'}</td>
								<td className='py-2 px-4 border'>
									{match.scoreTeamA ?? '-'} : {match.scoreTeamB ?? '-'}
								</td>
								<td className='py-2 px-4 border'>{match.status}</td>
								<td className='py-2 px-4 border'>{match.round}</td>
								<td className='py-2 px-4 border'>{new Date(match.matchDate).toLocaleString()}</td>
							</tr>
						))}
					</tbody>
				)}
			</table>
		</div>
	);
}

export function MatchTableSkeleton() {
	return (
		<tbody>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i}>
					{Array.from({ length: 8 }).map((_, j) => (
						<td key={j} className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
