'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogHeader,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { User } from '@prisma/client';

interface InviteButtonProps {
	user: User;
	teamId: number;
	completeSuccessfulInviteConfirmation: () => void;
	onOpenChange?: (isOpen: boolean) => void;
}

export function InviteConfirmationDialog({
	user,
	teamId,
	completeSuccessfulInviteConfirmation,
	onOpenChange,
}: InviteButtonProps) {
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		if (onOpenChange) {
			onOpenChange(isOpen);
		}
	}, [isOpen, onOpenChange]);

	async function inviteUser() {
		const response = await fetch(
			`/api/teams/${teamId}/invites`,
			{
				method: 'POST',
				body: JSON.stringify({ id: user.id }),
			}
		);

		setIsOpen(false);

		if (response.ok) {
			toast({
				variant: 'default',
				title: 'Invitation sent',
			});
			completeSuccessfulInviteConfirmation();
			return;
		}

		const json = await response.json();
		toast({
			variant: 'destructive',
			title: json.message || 'Error',
			description: "Couldn't send the invitation",
		});
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className='sm:max-w-[375px]'>
					<DialogHeader className='flex items-center pt-3'>
						<DialogTitle>Invitation confirmation</DialogTitle>
						<DialogDescription>
							You are inviting {user.name} to join your team.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex justify-center gap-2 pt-2'>
						<DialogClose asChild>
							<Button className='w-[40%]' variant='secondary'>Cancel</Button>
						</DialogClose>
						<Button className='w-[40%]' onClick={() => inviteUser()}>Invite</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
