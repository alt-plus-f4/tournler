'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import EditTeamDialog from './EditTeamDialog';
import { Cs2Team } from '@/types/types';

interface TeamActionsProps {
	team: Cs2Team;
	userId?: string | null;
	isUserTeamCaptain: boolean;
	allUsers?: any[];
	invitedPlayers?: any[];
}

export default function TeamActions({ team, userId, isUserTeamCaptain }: TeamActionsProps) {
	const [isEditOpen, setIsEditOpen] = useState(false);

	const handleSave = (updatedTeam: Cs2Team) => {
		// Simple UX: reload to reflect changes
		window.location.reload();
	};

	return (
		<div className='ml-auto flex flex-row gap-2'>
			{isUserTeamCaptain && (
				<>
					<Button variant='outline' onClick={() => setIsEditOpen(true)}>
						Edit Team
					</Button>
					<EditTeamDialog team={team} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={handleSave} />
				</>
			)}
		</div>
	);
}
