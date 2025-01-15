import { Tournament } from '@/types/tournaments';
import React from 'react';

interface ParticipantsProps {
    tournament: Tournament;
}

const Participants: React.FC<ParticipantsProps> = ({ tournament }) => {
    return (
        <div className='mt-6'>
            <h2 className='text-xl font-bold mb-4'>Participants</h2>
            <ul className='space-y-2'>
                {tournament.teams.map((team : any) => (
                    <li key={team.id} className='border p-2 rounded'>
                        {team.name}
                    </li>
                ))}
            </ul>
            <button className='mt-4 bg-blue-500 text-white p-2 rounded'>
                View All Participants
            </button>
        </div>
    );
};

export default Participants;