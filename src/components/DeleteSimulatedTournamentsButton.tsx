'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';

export function DeleteSimulatedTournamentsButton() {
	const router = useRouter();
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
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
			<DialogTrigger asChild>
				<Button variant='outline' className='border-red-500/40 bg-black text-red-400 hover:bg-red-500 hover:text-black'>
					Delete Simulated Tournaments
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete all simulated tournaments?</DialogTitle>
					<DialogDescription>This permanently deletes every tournament created by Simulate Tournament, along with their teams and fake players. Real tournaments and teams are not affected.</DialogDescription>
				</DialogHeader>
				<DialogFooter className='gap-2'>
					<DialogClose asChild>
						<Button variant='outline'>Cancel</Button>
					</DialogClose>
					<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
