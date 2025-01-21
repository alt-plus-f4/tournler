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
import { Cs2Team } from '@/types/types';

interface EditTeamDialogProps {
	team: Cs2Team | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedTeam: Cs2Team) => void;
}

export default function EditTeamDialog({
	team,
	isOpen,
	onClose,
	onSave,
}: EditTeamDialogProps) {
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<Cs2Team>>({});
	const { toast } = useToast();

	useEffect(() => {
		if (team) {
			setEditingTeam(team);
			setUpdatedFields({});
		}
	}, [team]);

	const handleChange = (
		field: keyof Cs2Team,
		value: string | number | null
	) => {
		setEditingTeam((prev) => (prev ? { ...prev, [field]: value } : null));
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTeam || Object.keys(updatedFields).length === 0) {
			toast({
				title: 'No Changes',
				description: 'No changes were made to the team.',
				variant: 'default',
			});
			return;
		}

		const response = await fetch(`/api/teams/${editingTeam.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updatedFields),
		});

		if (response.ok) {
			toast({
				title: 'Success',
				description: 'Team updated successfully',
				variant: 'default',
			});
			onSave({ ...editingTeam, ...updatedFields });
			onClose();
		} else {
			toast({
				title: 'Error',
				description: 'Failed to update team',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Team</DialogTitle>
					<DialogDescription>
						Update the team details below.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='space-y-2'>
					<Label htmlFor='edit-name'>Team Name</Label>
					<Input
						id='edit-name'
						value={editingTeam?.name || ''}
						onChange={(e) => handleChange('name', e.target.value)}
						required
					/>
					<Label htmlFor='edit-logo'>Team Logo URL</Label>
					<Input
						id='edit-logo'
						value={editingTeam?.logo || ''}
						onChange={(e) => handleChange('logo', e.target.value)}
					/>
					<Label htmlFor='edit-capitanId'>Captain ID</Label>
					<Input
						id='edit-capitanId'
						value={editingTeam?.capitanId || ''}
						onChange={(e) =>
							handleChange('capitanId', e.target.value)
						}
					/>
					<Label htmlFor='edit-tournamentId'>Tournament ID</Label>
					<Input
						id='edit-tournamentId'
						type='number'
						value={editingTeam?.cs2TournamentId || ''}
						onChange={(e) =>
							handleChange(
								'cs2TournamentId',
								e.target.value ? Number(e.target.value) : null
							)
						}
					/>
					<Button type='submit' className='w-full'>
						Update Team
					</Button>
				</form>
				<DialogClose asChild>
					<Button variant='outline'>Close</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
