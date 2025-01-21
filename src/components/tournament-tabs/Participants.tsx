import { TeamCard } from '@/components/TeamCard';
import { Tournament } from '@/types/types';

interface ParticipantsProps {
	tournament: Tournament;
}

const Participants: React.FC<ParticipantsProps> = ({ tournament }) => {
	const teams = tournament.teams;
	return (
		<>
			<h1 className='text-2xl font-bold m-6 ml-1'>Participants</h1>
			<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8'>
				{teams.length > 0 ? (
					teams.map((team: any) => (
						<TeamCard key={team.id} team={team} />
					))
				) : (
					<p>No teams</p>
				)}
			</div>
		</>
	);
};

export default Participants;
