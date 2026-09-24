'use client';

import { TeamLogo } from '@/components/TeamLogo';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
	onDelete?: (teamId: number) => void;
}

export default function EditTeamDialog({ team, isOpen, onClose, onSave, onDelete }: EditTeamDialogProps) {
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<Cs2Team>>({});
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (team) {
			setEditingTeam(team);
			setUpdatedFields({});
			setLogoFile(null);
			setLogoPreview(null);
			setIsConfirmingDelete(false);
		}
	}, [team]);

	useEffect(() => {
		if (!logoFile) return;
		const url = URL.createObjectURL(logoFile);
		setLogoPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [logoFile]);

	const handleChange = (field: keyof Cs2Team, value: string | number | null) => {
		setEditingTeam((prev) => (prev ? { ...prev, [field]: value } : null));
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTeam || (Object.keys(updatedFields).length === 0 && !logoFile)) {
			toast({ title: 'No Changes', description: 'No changes were made to the team.' });
			return;
		}

		if (updatedFields.background !== undefined && updatedFields.background !== null) {
			const val = String(updatedFields.background);
			if (!/^#([0-9A-Fa-f]{6})$/.test(val)) {
				toast({ title: 'Invalid color', description: 'Background must be a hex color like #112233', variant: 'destructive' });
				return;
			}
		}

		setIsSaving(true);
		try {
			let newTeam = { ...editingTeam } as Cs2Team;

			if (logoFile) {
				const fd = new FormData();
				fd.append('teamId', String(editingTeam.id));
				fd.append('logoFile', logoFile);
				const uploadRes = await fetch('/api/teams/logo', { method: 'POST', body: fd });
				if (uploadRes.ok) {
					const json = await uploadRes.json();
					newTeam = { ...newTeam, ...json.team };
					setLogoFile(null);
				} else {
					toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
					return;
				}
			}

			const fieldsToPatch = { ...updatedFields } as Record<string, any>;
			delete fieldsToPatch.logo;

			if (Object.keys(fieldsToPatch).length > 0) {
				const response = await fetch(`/api/teams/${editingTeam.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(fieldsToPatch),
				});

				if (!response.ok) throw new Error('Failed to update team');
				const json = await response.json();
				newTeam = { ...newTeam, ...json.team };
			}

			toast({ title: 'Success', description: 'Team updated successfully' });
			onSave(newTeam);
			onClose();
		} catch (error) {
			console.error('Failed to update team', error);
			toast({ title: 'Error', description: 'Failed to update team', variant: 'destructive' });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editingTeam) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/teams/${editingTeam.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
			if (!response.ok) throw new Error('Failed to delete team');

			toast({ title: 'Team deleted', description: `${editingTeam.name} was removed.` });
			onDelete?.(editingTeam.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete team', error);
			toast({ variant: 'destructive', title: 'Could not delete team', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	if (isConfirmingDelete) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete this team?</DialogTitle>
						<DialogDescription>{editingTeam?.name} will be permanently deleted, along with its match history. This can&apos;t be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setIsConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Deleting…' : 'Delete team'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	const previewSrc = logoPreview ?? editingTeam?.logo ?? null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[460px]'>
				<DialogHeader>
					<DialogTitle>Edit team</DialogTitle>
					<DialogDescription>Update the team&apos;s details below.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='space-y-5'>
					<div className='flex items-center gap-4'>
						<TeamLogo src={previewSrc} name={editingTeam?.name} size='lg' className='h-16 w-16' />
						<div className='flex-1 space-y-2'>
							<Label htmlFor='edit-name'>Team Name</Label>
							<Input id='edit-name' value={editingTeam?.name || ''} onChange={(e) => handleChange('name', e.target.value)} required />
						</div>
					</div>

					<div className='space-y-3'>
						<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Branding</p>
						<div className='space-y-2'>
							<Label htmlFor='edit-logo-file'>Team Logo</Label>
							<Input id='edit-logo-file' type='file' accept='image/*' onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
							{logoFile && <p className='text-xs text-muted-foreground'>Selected: {logoFile.name}</p>}
						</div>
						<div className='flex items-center gap-3'>
							<Label htmlFor='edit-background' className='shrink-0'>
								Background Color
							</Label>
							<Input id='edit-background' type='color' value={(editingTeam?.background as string) || '#000000'} onChange={(e) => handleChange('background', e.target.value)} className='h-9 w-16 p-1' />
							<span className='text-sm font-mono text-muted-foreground'>{(editingTeam?.background as string) || '#000000'}</span>
						</div>
					</div>

					<DialogFooter className='flex flex-wrap justify-end gap-2 pt-2'>
						{onDelete && (
							<Button type='button' variant='destructive' className='mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete team…
							</Button>
						)}
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving}>
							{isSaving ? 'Saving…' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
