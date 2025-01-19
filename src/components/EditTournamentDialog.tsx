'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { Tournament } from '@/types/types';

const tournamentStatuses = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;
const tournamentTypes = ['ONLINE', 'OFFLINE'] as const;

interface EditTournamentDialogProps {
	tournament: Tournament | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedTournament: Tournament) => void;
}

export default function EditTournamentDialog({
	tournament,
	isOpen,
	onClose,
	onSave,
}: EditTournamentDialogProps) {
	const [editingTournament, setEditingTournament] =
		useState<Tournament | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<Tournament>>({});
	const { toast } = useToast();

	useEffect(() => {
		if (tournament) {
			setEditingTournament({
				...tournament,
				startDate: tournament.startDate
					? new Date(tournament.startDate).toISOString().split('T')[0]
					: '',
				endDate: tournament.endDate
					? new Date(tournament.endDate).toISOString().split('T')[0]
					: '',
			});
			setUpdatedFields({});
		}
	}, [tournament]);

	const handleChange = (field: keyof Tournament, value: string | number) => {
		setEditingTournament((prev) =>
			prev ? { ...prev, [field]: value } : null
		);
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTournament || Object.keys(updatedFields).length === 0) {
			toast({
				title: 'No Changes',
				description: 'No changes were made to the tournament.',
				variant: 'default',
			});
			return;
		}

		const response = await fetch(
			`/api/tournaments/${editingTournament.id}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedFields),
			}
		);

		if (response.ok) {
			toast({
				title: 'Success',
				description: 'Tournament updated successfully',
				variant: 'default',
			});
			onSave({ ...editingTournament, ...updatedFields });
			onClose();
		} else {
			toast({
				title: 'Error',
				description: 'Failed to update tournament',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='h-[800px] overflow-scroll'>
				<DialogHeader>
					<DialogTitle>Edit Tournament</DialogTitle>
					<DialogDescription>
						Update the tournament details.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='space-y-2'>
					<Label htmlFor='edit-name'>Tournament Name</Label>
					<Input
						id='edit-name'
						value={editingTournament?.name || ''}
						onChange={(e) => handleChange('name', e.target.value)}
						required
					/>
					<Label htmlFor='edit-prizePool'>Prize Pool</Label>
					<Input
						id='edit-prizePool'
						type='number'
						value={editingTournament?.prizePool || ''}
						onChange={(e) =>
							handleChange('prizePool', Number(e.target.value))
						}
						required
					/>
					<Label htmlFor='edit-teamCapacity'>Team Capacity</Label>
					<Input
						id='edit-teamCapacity'
						type='number'
						value={editingTournament?.teamCapacity || ''}
						onChange={(e) =>
							handleChange('teamCapacity', Number(e.target.value))
						}
						required
					/>
					<Label htmlFor='edit-location'>Location</Label>
					<Input
						id='edit-location'
						value={editingTournament?.location || ''}
						onChange={(e) =>
							handleChange('location', e.target.value)
						}
						required
					/>
					<Label htmlFor='edit-startDate'>Start Date</Label>
					<Input
						id='edit-startDate'
						type='date'
						value={editingTournament?.startDate || ''}
						onChange={(e) =>
							handleChange('startDate', e.target.value)
						}
						required
					/>
					<Label htmlFor='edit-endDate'>End Date</Label>
					<Input
						id='edit-endDate'
						type='date'
						value={editingTournament?.endDate || ''}
						onChange={(e) =>
							handleChange('endDate', e.target.value)
						}
						required
					/>
					<Label htmlFor='edit-status'>Status</Label>
					<select
						id='edit-status'
						value={editingTournament?.status || ''}
						onChange={(e) => handleChange('status', e.target.value)}
						className='border rounded p-2 w-full bg-black text-white'
					>
						{tournamentStatuses.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
					<Label htmlFor='edit-type'>Type</Label>
					<select
						id='edit-type'
						value={editingTournament?.type || ''}
						onChange={(e) => handleChange('type', e.target.value)}
						className='border rounded p-2 w-full bg-black text-white'
					>
						{tournamentTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
					<Button type='submit' className='w-full'>
						Update Tournament
					</Button>
				</form>
				<DialogClose asChild>
					<Button variant='outline'>Close</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
