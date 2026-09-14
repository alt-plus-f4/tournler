'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { BADGE_ICON_KEYS, BadgeIcon } from '@/lib/badge-icons';
import { cn } from '@/lib/utils';

export interface BadgeDefinition {
	id: number;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	isOverlay: boolean;
	_count?: { awards: number };
}

interface EditBadgeDialogProps {
	badge: BadgeDefinition | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (badge: BadgeDefinition) => void;
	onDelete?: (badgeId: number) => void;
}

const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

export default function EditBadgeDialog({ badge, isOpen, onClose, onSave, onDelete }: EditBadgeDialogProps) {
	const isCreating = badge === null;
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [icon, setIcon] = useState(BADGE_ICON_KEYS[0]);
	const [color, setColor] = useState('#facc15');
	const [isOverlay, setIsOverlay] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (isOpen) {
			setName(badge?.name ?? '');
			setDescription(badge?.description ?? '');
			setIcon(badge?.icon ?? BADGE_ICON_KEYS[0]);
			setColor(badge?.color ?? '#facc15');
			setIsOverlay(badge?.isOverlay ?? false);
			setIsConfirmingDelete(false);
		}
	}, [badge, isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!HEX_COLOR.test(color)) {
			toast({ variant: 'destructive', title: 'Invalid color', description: 'Color must be a hex value like #facc15' });
			return;
		}
		setIsSaving(true);
		try {
			const url = isCreating ? '/api/admin/badges' : `/api/admin/badges/${badge.id}`;
			const method = isCreating ? 'POST' : 'PATCH';
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, icon, color, isOverlay }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to save badge');

			toast({ title: isCreating ? 'Badge created' : 'Badge updated' });
			onSave(payload.badge);
			onClose();
		} catch (error) {
			console.error('Failed to save badge', error);
			toast({ variant: 'destructive', title: 'Could not save badge', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!badge) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/admin/badges/${badge.id}`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete badge');

			toast({ title: 'Badge deleted', description: `${badge.name} was removed and revoked from all players.` });
			onDelete?.(badge.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete badge', error);
			toast({ variant: 'destructive', title: 'Could not delete badge', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	if (isConfirmingDelete && badge) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className='sm:max-w-[440px]'>
					<DialogHeader>
						<DialogTitle>Delete &quot;{badge.name}&quot;?</DialogTitle>
						<DialogDescription>
							This revokes it from every player who currently holds it ({badge._count?.awards ?? 0}). This can&apos;t be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='gap-2'>
						<Button variant='outline' onClick={() => setIsConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[480px]'>
				<DialogHeader>
					<DialogTitle>{isCreating ? 'Create Badge' : 'Edit Badge'}</DialogTitle>
					<DialogDescription>Badges are awarded to individual players from the Users page.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-5'>
					<div className='flex items-center gap-4'>
						<div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10' style={{ backgroundColor: `${color}20` }}>
							<BadgeIcon name={icon} className='h-8 w-8' style={{ color }} />
						</div>
						<div className='flex-1 space-y-2'>
							<Label htmlFor='badge-name'>Name</Label>
							<Input id='badge-name' value={name} onChange={(e) => setName(e.target.value)} placeholder='Tournament Champion' required />
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='badge-description'>Description</Label>
						<Input id='badge-description' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Won a Tournler tournament' />
					</div>

					<div className='space-y-2'>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Icon</p>
						<div className='grid grid-cols-7 gap-2'>
							{BADGE_ICON_KEYS.map((key) => (
								<button
									key={key}
									type='button'
									onClick={() => setIcon(key)}
									className={cn('flex h-10 w-10 items-center justify-center rounded-lg border transition-colors', icon === key ? 'border-white bg-white/10' : 'border-white/10 hover:border-white/30')}
									aria-label={key}
									aria-pressed={icon === key}
								>
									<BadgeIcon name={key} className='h-5 w-5' />
								</button>
							))}
						</div>
					</div>

					<div className='flex items-center gap-3'>
						<Label htmlFor='badge-color' className='shrink-0'>
							Color
						</Label>
						<Input id='badge-color' type='color' value={color} onChange={(e) => setColor(e.target.value)} className='h-9 w-16 p-1' />
						<span className='text-sm font-mono text-muted-foreground'>{color}</span>
					</div>

					<label htmlFor='badge-overlay' className='flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer'>
						<input id='badge-overlay' type='checkbox' checked={isOverlay} onChange={(e) => setIsOverlay(e.target.checked)} className='h-4 w-4 shrink-0 accent-white' />
						<span className='text-sm'>
							Show on avatar
							<span className='block text-xs text-muted-foreground'>Pins this badge as a small icon on the player&apos;s profile picture (e.g. Verified, Gold) instead of the badge row.</span>
						</span>
					</label>

					<DialogFooter className='gap-2 pt-2'>
						{!isCreating && onDelete && (
							<Button type='button' variant='destructive' className='mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete
							</Button>
						)}
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving}>
							{isSaving ? 'Saving...' : isCreating ? 'Create Badge' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
