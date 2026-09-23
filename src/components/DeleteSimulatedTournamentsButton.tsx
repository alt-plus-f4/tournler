'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';

interface DevToolDialogProps {
	/** When provided the dialog is controlled and no trigger button is rendered (used from the admin "Dev tools" menu). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function DeleteSimulatedTournamentsButton({ open, onOpenChange }: DevToolDialogProps = {}) {
	const router = useRouter();
	const { toast } = useToast();
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = open !== undefined;
	const isOpen = isControlled ? open : internalOpen;
	const setIsOpen = (next: boolean) => {
		if (!isControlled) setInternalOpen(next);
		onOpenChange?.(next);
	};
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);

		try {
			const response = await fetch('/api/tournaments/simulate', { method: 'DELETE' });
			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to delete simulated tournaments');
			}

			toast({
				title: 'Simulated data deleted',
				description: `${payload.tournamentsDeleted} tournament(s), ${payload.teamsDeleted} team(s), ${payload.playersDeleted} player(s) removed.`,
			});
			setIsOpen(false);
			router.refresh();
		} catch (error) {
			console.error('Failed to delete simulated tournaments', error);
			toast({
				variant: 'destructive',
				title: 'Could not delete simulated tournaments',
				description: error instanceof Error ? error.message : 'An unexpected error occurred',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{!isControlled && (
				<DialogTrigger asChild>
					<Button variant='outline'>
						Delete simulated tournaments
					</Button>
				</DialogTrigger>
			)}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete all simulated tournaments?</DialogTitle>
					<DialogDescription>This permanently deletes every tournament created by Simulate Tournament, along with their teams and fake players. Real tournaments and teams are not affected.</DialogDescription>
				</DialogHeader>
				<DialogFooter className='flex justify-end gap-2'>
					<DialogClose asChild>
						<Button variant='outline'>Cancel</Button>
					</DialogClose>
					<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
						{isDeleting ? 'Deleting…' : 'Delete simulated data'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
