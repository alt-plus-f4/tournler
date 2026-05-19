'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
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

export default function EditTeamDialog({ team, isOpen, onClose, onSave }: EditTeamDialogProps) {
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<Cs2Team>>({});
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		if (team) {
			setEditingTeam(team);
			setUpdatedFields({});
		}
	}, [team]);

	const handleChange = (field: keyof Cs2Team, value: string | number | null) => {
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

		// Validate background color if provided
		if (updatedFields.background !== undefined && updatedFields.background !== null) {
			const val = String(updatedFields.background);
			if (!/^#([0-9A-Fa-f]{6})$/.test(val)) {
				toast({ title: 'Invalid color', description: 'Background must be a hex color like #112233', variant: 'destructive' });
				return;
			}
		}

		let newTeam = { ...editingTeam } as Cs2Team;

		// If a logo file was provided, upload it first via the dedicated endpoint
		if (logoFile) {
			const fd = new FormData();
			fd.append('teamId', String(editingTeam.id));
			fd.append('logoFile', logoFile);
			const uploadRes = await fetch('/api/teams/logo', { method: 'POST', body: fd });
			if (uploadRes.ok) {
				const json = await uploadRes.json();
				newTeam = { ...newTeam, ...json.team };
				// continue to PATCH other fields if any
				// fallthrough
			} else {
				toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
				return;
			}
		}

		// If there are other fields to update (like name or background), PATCH them
		const fieldsToPatch = { ...updatedFields } as Record<string, any>;
		// if logo was uploaded, remove logo from fieldsToPatch to avoid overwriting with old value
		if (logoFile && fieldsToPatch.logo) delete fieldsToPatch.logo;

		if (Object.keys(fieldsToPatch).length > 0) {
			const response = await fetch(`/api/teams/${editingTeam.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(fieldsToPatch),
			});

			if (response.ok) {
				const json = await response.json();
				newTeam = { ...newTeam, ...json.team };
				toast({ title: 'Success', description: 'Team updated successfully', variant: 'default' });
				onSave(newTeam);
				onClose();
				return;
			} else {
				toast({ title: 'Error', description: 'Failed to update team', variant: 'destructive' });
				return;
			}
		} else {
			// No additional fields, but possibly logo upload already updated team
			toast({ title: 'Success', description: 'Team updated', variant: 'default' });
			onSave(newTeam);
			onClose();
			return;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Team</DialogTitle>
					<DialogDescription>Update the team details below.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='space-y-2'>
					<Label htmlFor='edit-name'>Team Name</Label>
					<Input id='edit-name' value={editingTeam?.name || ''} onChange={(e) => handleChange('name', e.target.value)} required />
					<Label htmlFor='edit-logo'>Team Logo URL</Label>
					<Input id='edit-logo' value={editingTeam?.logo || ''} onChange={(e) => handleChange('logo', e.target.value)} />
					<Label htmlFor='edit-logo-file' className='mt-2'>
						Or upload logo
					</Label>
					<Input id='edit-logo-file' type='file' onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
					<div className='flex items-center gap-2'>
						<Label htmlFor='edit-background' className='mt-2'>
							Background Color
						</Label>
						<div className='w-6 h-6 rounded-sm border' style={{ backgroundColor: (editingTeam?.background as string) || '#000000' }} />
					</div>
					<Input id='edit-background' type='color' value={(editingTeam?.background as string) || '#000000'} onChange={(e) => handleChange('background', e.target.value)} />
					<Label htmlFor='edit-capitanId'>Captain ID</Label>
					<Input id='edit-capitanId' value={editingTeam?.capitanId || ''} onChange={(e) => handleChange('capitanId', e.target.value)} />
					<Label htmlFor='edit-tournamentId'>Tournament ID</Label>
					<Input id='edit-tournamentId' type='number' value={editingTeam?.cs2TournamentId || ''} onChange={(e) => handleChange('cs2TournamentId', e.target.value ? Number(e.target.value) : null)} />
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
