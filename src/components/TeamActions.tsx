'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Cs2Team } from '@/types/types';

// The edit form (uploads, roster fields) is only fetched once a captain first opens it.
const EditTeamDialog = dynamic(() => import('./EditTeamDialog'));

interface TeamActionsProps {
	team: Cs2Team;
	userId?: string | null;
	isUserTeamCaptain: boolean;
	allUsers?: any[];
	invitedPlayers?: any[];
}

export default function TeamActions({ team, isUserTeamCaptain }: TeamActionsProps) {
	const [isEditOpen, setIsEditOpen] = useState(false);
	// Stays true after the first open so the dialog stays mounted and can animate closed.
	const [editMounted, setEditMounted] = useState(false);

	const handleSave = () => {
		// Simple UX: reload to reflect changes
		window.location.reload();
	};

	return (
		<div className='ml-auto flex flex-row gap-2'>
			{isUserTeamCaptain && (
				<>
					<Button
						variant='outline'
						onClick={() => {
							setEditMounted(true);
							setIsEditOpen(true);
						}}
					>
						Edit Team
					</Button>
					{editMounted && <EditTeamDialog team={team} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSave={handleSave} />}
				</>
			)}
		</div>
	);
}
