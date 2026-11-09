import { TeamCard } from '@/components/TeamCard';
import type { ExtendedCs2Team } from '@/lib/models/team-model';
import type { TournamentDetail } from './types';

export default function Participants({ tournament }: { tournament: TournamentDetail }) {
	const { teams, teamCapacity } = tournament;

	return (
		<section aria-labelledby='participants-heading' className='p-4 sm:p-6'>
			<div className='mb-4 flex items-baseline justify-between gap-4'>
				<h2 id='participants-heading' className='text-2xl font-bold'>
					Participants
				</h2>
				<p className='font-mono text-sm tabular-nums text-muted-foreground'>
					<span className='text-white'>{teams.length}</span>/{teamCapacity} teams
				</p>
			</div>
			{teams.length > 0 ? (
				<ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
					{teams.map((team) => (
						<li key={team.id}>
							{/* TeamCard is typed against the full Prisma team; the page selects the fields it renders. */}
							<TeamCard team={team as unknown as ExtendedCs2Team} />
						</li>
					))}
				</ul>
			) : (
				<p className='rounded-md border border-border p-8 text-center text-muted-foreground'>No teams registered yet.</p>
			)}
		</section>
	);
}
