'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUp, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { BADGE_ICON_KEYS, BADGE_IMAGE_MAX_BYTES, BADGE_IMAGE_TYPES, BadgeIcon } from '@/lib/badge-icons';
import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import { cn } from '@/lib/utils';

export interface BadgeDefinition {
	id: number;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	isOverlay: boolean;
	imageUrl: string | null;
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
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
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
			setImageUrl(badge?.imageUrl ?? null);
			setUploadError(null);
			setIsConfirmingDelete(false);
		}
	}, [badge, isOpen]);

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		setUploadError(null);
		if (!(BADGE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
			setUploadError('Use a PNG, JPEG, WebP or SVG image.');
			return;
		}
		if (file.size > BADGE_IMAGE_MAX_BYTES) {
			setUploadError('Image must be smaller than 2 MB.');
			return;
		}
		setIsUploading(true);
		try {
			const body = new FormData();
			body.append('file', file);
			const response = await fetch('/api/admin/badges/image', { method: 'POST', body });
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Upload failed. Try again in a moment.');
			setImageUrl(payload.url);
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : 'Upload failed. Try again in a moment.');
		} finally {
			setIsUploading(false);
		}
	};

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
				body: JSON.stringify({ name, description, icon, color, isOverlay, imageUrl }),
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
					<DialogFooter className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setIsConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Deleting…' : 'Delete'}
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
						<TrophyIcon badge={{ name: name || 'Badge preview', icon, color, imageUrl }} size={64} fallback='tint' />
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
						<p id='badge-image-label' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
							Trophy image
						</p>
						<div className='flex flex-wrap items-center gap-2' role='group' aria-labelledby='badge-image-label'>
							<input
								ref={fileInputRef}
								id='badge-image-file'
								type='file'
								accept={BADGE_IMAGE_TYPES.join(',')}
								onChange={handleFile}
								className='sr-only'
								tabIndex={-1}
								aria-describedby='badge-image-hint'
							/>
							<Button type='button' variant='outline' size='sm' onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
								{isUploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <ImageUp className='mr-2 h-4 w-4' />}
								{isUploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
							</Button>
							{imageUrl && !isUploading && (
								<Button type='button' variant='ghost' size='sm' onClick={() => setImageUrl(null)}>
									<X className='mr-2 h-4 w-4' /> Remove image
								</Button>
							)}
						</div>
						<p id='badge-image-hint' className='text-xs text-muted-foreground'>
							PNG, JPEG, WebP or SVG, up to 2 MB. Square artwork on a transparent background works best. {imageUrl ? 'The icon below is only used if you remove the image.' : 'Without an image, the icon and color below are used.'}
						</p>
						{uploadError && (
							<p role='alert' className='text-xs text-signal-live'>
								{uploadError}
							</p>
						)}
					</div>

					<div className='space-y-2'>
						<p id='badge-icon-label' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
							{imageUrl ? 'Fallback icon' : 'Icon'}
						</p>
						<div role='group' aria-labelledby='badge-icon-label' className='grid grid-cols-7 gap-2'>
							{BADGE_ICON_KEYS.map((key) => (
								<button
									key={key}
									type='button'
									onClick={() => setIcon(key)}
									className={cn('flex h-10 w-10 items-center justify-center rounded-md border transition-colors', icon === key ? 'border-white bg-white/10' : 'border-border hover:border-white/30')}
									aria-label={`${key} icon`}
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

					<label htmlFor='badge-overlay' className='flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer'>
						<input id='badge-overlay' type='checkbox' checked={isOverlay} onChange={(e) => setIsOverlay(e.target.checked)} className='h-4 w-4 shrink-0 accent-white' />
						<span className='text-sm'>
							Show on avatar
							<span className='block text-xs text-muted-foreground'>Pins this badge as a small icon on the player&apos;s profile picture (e.g. Verified, Gold) instead of the badge row.</span>
						</span>
					</label>

					<DialogFooter className='flex flex-wrap justify-end gap-2 pt-2'>
						{!isCreating && onDelete && (
							<Button type='button' variant='destructive' className='mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete
							</Button>
						)}
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving || isUploading}>
							{isSaving ? 'Saving…' : isCreating ? 'Create Badge' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
