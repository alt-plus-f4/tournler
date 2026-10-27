'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogEyebrow, dialogPanelTitle } from '@/components/ui/dialog';
import { fieldLabel, sectionLabel } from '@/components/ui/dialog-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { Tournament } from '@/types/types';
import { RichTextEditor } from '@/components/LazyRichTextEditor';
import { GAME_META, GAMES } from '@/lib/games';
import { GameGlyph } from '@/components/games/GameMark';
import { ImageField } from '@/components/ImageField';

export const tournamentStatuses = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;
export const tournamentTypes = ['ONLINE', 'OFFLINE'] as const;

interface EditTournamentDialogProps {
	tournament: Tournament | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedTournament: Tournament) => void;
	onDelete?: (tournamentId: number) => void;
}

export default function EditTournamentDialog({ tournament, isOpen, onClose, onSave, onDelete }: EditTournamentDialogProps) {
	const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<Tournament>>({});
	const [bannerFile, setBannerFile] = useState<File | null>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (tournament) {
			setEditingTournament({
				...tournament,
				startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : '',
				endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : '',
			});
			setUpdatedFields({});
			setBannerFile(null);
			setLogoFile(null);
			setIsConfirmingDelete(false);
		}
	}, [tournament]);

	const handleChange = (field: keyof Tournament, value: string | number) => {
		setEditingTournament((prev) => (prev ? { ...prev, [field]: value } : null));
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		const hasFieldChanges = Object.keys(updatedFields).length > 0;
		const hasMediaChanges = !!bannerFile || !!logoFile;
		if (!editingTournament || (!hasFieldChanges && !hasMediaChanges)) {
			toast({ title: 'No Changes', description: 'No changes were made to the tournament.', variant: 'default' });
			return;
		}

		setIsSaving(true);
		try {
			let mediaUpdates: Partial<Tournament> = {};
			if (hasMediaChanges) {
				const media = new FormData();
				if (bannerFile) media.append('bannerFile', bannerFile);
				if (logoFile) media.append('logoFile', logoFile);
				const mediaResponse = await fetch(`/api/tournaments/${editingTournament.id}/media`, { method: 'POST', body: media });
				const mediaPayload = await mediaResponse.json().catch(() => null);
				if (!mediaResponse.ok) throw new Error(mediaPayload?.error || 'Failed to upload image');
				mediaUpdates = { bannerUrl: mediaPayload.tournament.bannerUrl, logoUrl: mediaPayload.tournament.logoUrl };
			}

			if (hasFieldChanges) {
				const response = await fetch(`/api/tournaments/${editingTournament.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedFields),
				});

				if (!response.ok) {
					const payload = await response.json().catch(() => null);
					throw new Error(payload?.error || 'Failed to update tournament');
				}
			}

			toast({ title: 'Success', description: 'Tournament updated successfully', variant: 'default' });
			onSave({ ...editingTournament, ...updatedFields, ...mediaUpdates });
			onClose();
		} catch (error) {
			console.error('Failed to update tournament', error);
			toast({ title: 'Could not save tournament', description: error instanceof Error ? error.message : 'Failed to update tournament', variant: 'destructive' });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editingTournament) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/tournaments/${editingTournament.id}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to delete tournament');

			toast({ title: 'Tournament deleted', description: `${editingTournament.name} was removed.` });
			onDelete?.(editingTournament.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete tournament', error);
			toast({ variant: 'destructive', title: 'Could not delete tournament', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	// The API refuses a game change once any team registered (they were checked against the old
	// game's accounts); the control mirrors that rule instead of letting the save fail.
	const registeredTeams = tournament?.teams?.length ?? 0;
	const gameLocked = registeredTeams > 0 || (tournament?.matches?.length ?? 0) > 0;
	const game = editingTournament?.game ?? 'CS2';

	if (isConfirmingDelete) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent panel className='max-w-md'>
					<DialogHeader className='pr-8'>
						<DialogEyebrow>Confirm</DialogEyebrow>
						<DialogTitle className={dialogPanelTitle}>Delete this tournament?</DialogTitle>
						<DialogDescription className='pt-1 leading-relaxed'>{editingTournament?.name} will be permanently deleted, along with its matches. This can&apos;t be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter bar>
						<Button variant='outline' onClick={() => setIsConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Deleting…' : 'Delete tournament'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent panel className='max-h-[88vh] overflow-y-auto sm:max-w-[640px]'>
				<DialogHeader className='pr-8'>
					<DialogEyebrow>Admin</DialogEyebrow>
					<DialogTitle className={dialogPanelTitle}>Edit tournament</DialogTitle>
					<DialogDescription className='pt-1'>Update the tournament details.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='grid gap-5'>
					<div className='space-y-3'>
						<p className={sectionLabel}>Details</p>
						<div className='space-y-2'>
							<Label htmlFor='edit-name' className={fieldLabel}>
								Tournament Name
							</Label>
							<Input id='edit-name' value={editingTournament?.name || ''} onChange={(e) => handleChange('name', e.target.value)} required />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='edit-location' className={fieldLabel}>
								Location
							</Label>
							<Input id='edit-location' value={editingTournament?.location || ''} onChange={(e) => handleChange('location', e.target.value)} required />
						</div>
						<div className='space-y-2'>
							<Label id='edit-description-label' className={fieldLabel}>
								Description
							</Label>
							<RichTextEditor
								labelId='edit-description-label'
								value={editingTournament?.description || ''}
								onChange={(html) => handleChange('description', html)}
								placeholder='Tell players what this tournament is about'
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='edit-prizePool' className={fieldLabel}>
									Prize Pool
								</Label>
								<Input
									id='edit-prizePool'
									type='number'
									className='font-mono tabular-nums'
									value={editingTournament?.prizePool || ''}
									onChange={(e) => handleChange('prizePool', Number(e.target.value))}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-teamCapacity' className={fieldLabel}>
									Team Capacity
								</Label>
								<Input
									id='edit-teamCapacity'
									type='number'
									className='font-mono tabular-nums'
									value={editingTournament?.teamCapacity || ''}
									onChange={(e) => handleChange('teamCapacity', Number(e.target.value))}
									required
								/>
							</div>
						</div>
					</div>

					<div className='space-y-3 border-t border-border pt-5'>
						<p className={sectionLabel}>Schedule</p>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='edit-startDate' className={fieldLabel}>
									Start Date
								</Label>
								<Input id='edit-startDate' type='date' value={editingTournament?.startDate || ''} onChange={(e) => handleChange('startDate', e.target.value)} required />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-endDate' className={fieldLabel}>
									End Date
								</Label>
								<Input id='edit-endDate' type='date' value={editingTournament?.endDate || ''} onChange={(e) => handleChange('endDate', e.target.value)} required />
							</div>
						</div>
					</div>

					<div className='space-y-3 border-t border-border pt-5'>
						<p className={sectionLabel}>Media</p>
						<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
							<ImageField id='edit-bannerFile' label='Banner' currentUrl={editingTournament?.bannerUrl} onFileChange={setBannerFile} aspect='aspect-video' />
							<ImageField id='edit-logoFile' label='Logo' currentUrl={editingTournament?.logoUrl} onFileChange={setLogoFile} aspect='aspect-square' />
						</div>
					</div>

					<div className='space-y-3 border-t border-border pt-5'>
						<p className={sectionLabel}>Configuration</p>
						<div className='space-y-2'>
							<Label htmlFor='edit-game' className={fieldLabel}>
								Game
							</Label>
							<Select value={game} onValueChange={(value) => handleChange('game', value)} disabled={gameLocked}>
								<SelectTrigger id='edit-game' aria-describedby='edit-game-hint'>
									<SelectValue placeholder='Select a game' />
								</SelectTrigger>
								<SelectContent>
									{GAMES.map((g) => (
										<SelectItem key={g} value={g}>
											<span className='inline-flex items-center gap-2'>
												<GameGlyph game={g} className='h-3.5 w-3.5' />
												{GAME_META[g].label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p id='edit-game-hint' className='text-xs text-muted-foreground'>
								{gameLocked
									? `Locked: ${registeredTeams} team${registeredTeams === 1 ? '' : 's'} registered for ${GAME_META[game].label}. Remove every team to change the game.`
									: game === 'LOL'
										? 'No hosted servers: staff record each match result.'
										: 'Every match gets a hosted CS2 server.'}
							</p>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='edit-status' className={fieldLabel}>
									Status
								</Label>
								<Select value={editingTournament?.status || 'UPCOMING'} onValueChange={(value) => handleChange('status', value)}>
									<SelectTrigger id='edit-status'>
										<SelectValue placeholder='Select a status' />
									</SelectTrigger>
									<SelectContent>
										{tournamentStatuses.map((status) => (
											<SelectItem key={status} value={status}>
												{status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-type' className={fieldLabel}>
									Type
								</Label>
								<Select value={editingTournament?.type || 'ONLINE'} onValueChange={(value) => handleChange('type', value)}>
									<SelectTrigger id='edit-type'>
										<SelectValue placeholder='Select a type' />
									</SelectTrigger>
									<SelectContent>
										{tournamentTypes.map((type) => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<DialogFooter bar className='flex-wrap'>
						{onDelete && (
							<Button type='button' variant='destructive' className='sm:mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete tournament…
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
