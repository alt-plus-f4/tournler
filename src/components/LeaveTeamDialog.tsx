'use client';

import { useToast } from '@/lib/hooks/use-toast';
import { ConfirmAction } from './ConfirmAction';
import type { ReactNode } from 'react';
import { removeMember } from '@/lib/helpers/remove-member';
import { useRouter } from 'next/navigation';

interface LeaveTeamDialogProps {
	teamId: number;
	userId: string;
	children: ReactNode;
}

export function LeaveTeamDialog({ teamId, userId, children }: LeaveTeamDialogProps) {
	const { toast } = useToast();
	const router = useRouter();

	async function leave() {
		const response = await removeMember(teamId, userId);
		if (response?.error) {
			toast({ variant: 'destructive', title: response.error, description: "Couldn't leave the team" });
			// Keeps the confirm dialog open so the player can see the error and retry.
			throw new Error(response.error);
		}
		toast({ variant: 'default', title: "You've left the team" });
		router.push('/teams');
	}

	return <ConfirmAction title='Leave this team?' description="You'll need a new invite from the captain to rejoin." confirmLabel='Leave team' onConfirm={leave} trigger={children} />;
}
