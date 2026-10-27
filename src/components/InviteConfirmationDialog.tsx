'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogHeader, DialogFooter, DialogEyebrow, dialogPanelTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ReducedUser } from '@/types/types';

interface InviteButtonProps {
	user: ReducedUser;
	teamId: number;
	completeSuccessfulInviteConfirmation: () => void;
	/** Fired the moment Invite is clicked, before the request settles, so the caller can show the invite as sent. */
	onInviteStart?: () => void;
	/** Fired when the request fails, so the caller can undo what onInviteStart showed. */
	onInviteFailed?: () => void;
	onOpenChange?: (isOpen: boolean) => void;
}

export function InviteConfirmationDialog({ user, teamId, completeSuccessfulInviteConfirmation, onInviteStart, onInviteFailed, onOpenChange }: InviteButtonProps) {
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		if (onOpenChange) {
			onOpenChange(isOpen);
		}
	}, [isOpen, onOpenChange]);

	async function inviteUser() {
		onInviteStart?.();
		setIsOpen(false);
		let response: Response;
		try {
			response = await fetch(`/api/teams/${teamId}/invites`, {
				method: 'POST',
				body: JSON.stringify({ id: user.id }),
			});
		} catch {
			onInviteFailed?.();
			toast({ variant: 'destructive', title: "Couldn't send the invitation", description: 'Something went wrong. Try again.' });
			return;
		}

		if (response.ok) {
			toast({
				variant: 'default',
				title: 'Invitation sent',
			});
			completeSuccessfulInviteConfirmation();

			return;
		}

		onInviteFailed?.();
		const json = await response.json().catch(() => ({}));
		toast({
			variant: 'destructive',
			title: "Couldn't send the invitation",
			description: json.error || json.message || 'Something went wrong. Try again.',
		});
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent panel className='sm:max-w-md'>
					<DialogHeader className='pr-8 text-left'>
						<DialogEyebrow>Team</DialogEyebrow>
						<DialogTitle className={dialogPanelTitle}>Invitation confirmation</DialogTitle>
						<DialogDescription className='pt-1 leading-relaxed'>
							<span className='font-semibold text-foreground'>{user.name}</span> will get an invite to join your team. They can accept or decline it from their notifications.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter bar>
						<DialogClose asChild>
							<Button variant='outline'>Cancel</Button>
						</DialogClose>
						<Button onClick={() => inviteUser()}>Invite</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
