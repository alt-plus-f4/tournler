'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { User, UserRole } from '@/types/types';
import { Checkbox } from './ui/checkbox';
import { BadgeIcon } from '@/lib/badge-icons';
import { BadgeDefinition } from './EditBadgeDialog';
import { X } from 'lucide-react';

const userRoles: UserRole[] = ['USER', 'MODERATOR', 'TOURNAMENT_ADMIN', 'CONTENT_ADMIN', 'ADMIN'];

interface EditUserDialogProps {
	user: User | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedUser: User) => void;
	onDelete?: (userId: string) => void;
}

interface AwardedBadge {
	badge: BadgeDefinition;
	awardedAt: string;
}

export default function EditUserDialog({ user, isOpen, onClose, onSave, onDelete }: EditUserDialogProps) {
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<User>>({});
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
	const [userBadges, setUserBadges] = useState<AwardedBadge[]>([]);
	const [badgeToAward, setBadgeToAward] = useState('');
	const [isAwarding, setIsAwarding] = useState(false);

	const { toast } = useToast();

	useEffect(() => {
		if (user && isOpen) {
			setEditingUser(user);
			setUpdatedFields({});
			setIsConfirmingDelete(false);

			Promise.all([fetch('/api/admin/badges').then((r) => r.json()), fetch(`/api/users/${user.id}`).then((r) => r.json())])
				.then(([badgesData, userData]) => {
					setAllBadges(badgesData.badges ?? []);
					setUserBadges(userData.user?.badges ?? []);
				})
				.catch((e) => console.error('Failed to load badges', e));
		}
	}, [user, isOpen]);

	const handleChange = (field: keyof User, value: any) => {
		setEditingUser((prev) => (prev ? { ...prev, [field]: value } : null));
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser || Object.keys(updatedFields).length === 0) {
			toast({ title: 'No Changes', description: 'No changes were made to the user.' });
			return;
		}

		setIsSaving(true);
		try {
			const response = await fetch(`/api/users/${editingUser.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedFields),
			});

			if (!response.ok) throw new Error('Failed to update user');

			toast({ title: 'Success', description: 'User updated successfully' });
			onSave({ ...editingUser, ...updatedFields });
			onClose();
		} catch (error) {
			console.error('Failed to update user', error);
			toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user' });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editingUser) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/users/${editingUser.id}`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete user');

			toast({ title: 'User deleted', description: `${editingUser.name || editingUser.email} was removed.` });
			onDelete?.(editingUser.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete user', error);
			toast({ variant: 'destructive', title: 'Could not delete user', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	const handleAwardBadge = async () => {
		if (!editingUser || !badgeToAward) return;
		setIsAwarding(true);
		try {
			const response = await fetch('/api/admin/badges/award', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: editingUser.id, badgeId: Number(badgeToAward) }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to award badge');

			setUserBadges((prev) => (prev.some((ub) => ub.badge.id === payload.award.badge.id) ? prev : [{ badge: payload.award.badge, awardedAt: payload.award.awardedAt }, ...prev]));
			setBadgeToAward('');
			toast({ title: 'Badge awarded' });
		} catch (error) {
			console.error('Failed to award badge', error);
			toast({ variant: 'destructive', title: 'Could not award badge', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsAwarding(false);
		}
	};

	const handleRevokeBadge = async (badgeId: number) => {
		if (!editingUser) return;
		try {
			const response = await fetch('/api/admin/badges/award', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: editingUser.id, badgeId }),
			});
			if (!response.ok) throw new Error('Failed to revoke badge');

			setUserBadges((prev) => prev.filter((ub) => ub.badge.id !== badgeId));
		} catch (error) {
			console.error('Failed to revoke badge', error);
			toast({ variant: 'destructive', title: 'Could not revoke badge' });
		}
	};

	const availableBadgesToAward = allBadges.filter((b) => !userBadges.some((ub) => ub.badge.id === b.id));

	if (isConfirmingDelete) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className='sm:max-w-[440px]'>
					<DialogHeader>
						<DialogTitle>Delete this user?</DialogTitle>
						<DialogDescription>
							{editingUser?.name || editingUser?.email} will be permanently deleted. This can&apos;t be undone.
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
			<DialogContent className='sm:max-w-[480px] max-h-[85vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Edit User</DialogTitle>
					<DialogDescription>Update the user&apos;s details, access, and badges.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleEdit} className='space-y-5'>
					<div className='flex items-center gap-4'>
						<div className='h-16 w-16 shrink-0 rounded-full overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center'>
							{editingUser?.image ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={editingUser.image} alt={editingUser.name ?? ''} className='h-full w-full object-cover' />
							) : (
								<span className='text-lg font-bold text-neutral-500'>{(editingUser?.name || '?').charAt(0).toUpperCase()}</span>
							)}
						</div>
						<div className='flex-1 space-y-2'>
							<Label htmlFor='edit-name'>Name</Label>
							<Input id='edit-name' value={editingUser?.name || ''} onChange={(e) => handleChange('name', e.target.value)} required />
						</div>
					</div>

					<div className='space-y-3'>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Profile</p>
						<div className='space-y-2'>
							<Label htmlFor='edit-email'>Email</Label>
							<Input id='edit-email' type='email' value={editingUser?.email || ''} onChange={(e) => handleChange('email', e.target.value)} required />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='edit-image'>Image URL</Label>
							<Input id='edit-image' value={editingUser?.image || ''} onChange={(e) => handleChange('image', e.target.value)} />
						</div>
					</div>

					<div className='space-y-3'>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Access</p>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='edit-role'>Role</Label>
								<Select value={editingUser?.role || 'USER'} onValueChange={(value) => handleChange('role', value)}>
									<SelectTrigger id='edit-role'>
										<SelectValue placeholder='Select a role' />
									</SelectTrigger>
									<SelectContent>
										{userRoles.map((role) => (
											<SelectItem key={role} value={role}>
												{role}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-emailVerified'>Email Verified</Label>
								<Input
									id='edit-emailVerified'
									type='datetime-local'
									value={editingUser?.emailVerified ? new Date(editingUser.emailVerified).toISOString().slice(0, 16) : ''}
									onChange={(e) => handleChange('emailVerified', e.target.value)}
								/>
							</div>
						</div>
						<div className='flex items-center justify-between rounded-md border border-white/10 px-3 py-2'>
							<Label htmlFor='edit-onboarding' className='cursor-pointer'>
								Onboarding Completed
							</Label>
							<Checkbox id='edit-onboarding' checked={editingUser?.isOnboardingCompleted || false} onCheckedChange={(checked) => handleChange('isOnboardingCompleted', checked)} />
						</div>
					</div>

					<div className='space-y-3'>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Badges</p>
						{userBadges.length > 0 && (
							<div className='flex flex-wrap gap-2'>
								{userBadges.map(({ badge }) => (
									<span key={badge.id} className='inline-flex items-center gap-1.5 rounded-full border border-white/10 py-1 pl-2 pr-1 text-xs' style={{ backgroundColor: `${badge.color}15` }}>
										<BadgeIcon name={badge.icon} className='h-3.5 w-3.5' style={{ color: badge.color }} />
										{badge.name}
										<button type='button' onClick={() => handleRevokeBadge(badge.id)} className='rounded-full p-0.5 hover:bg-white/10' aria-label={`Revoke ${badge.name}`}>
											<X className='h-3 w-3' />
										</button>
									</span>
								))}
							</div>
						)}
						<div className='flex gap-2'>
							<Select value={badgeToAward} onValueChange={setBadgeToAward}>
								<SelectTrigger className='flex-1'>
									<SelectValue placeholder={availableBadgesToAward.length ? 'Award a badge...' : 'No more badges to award'} />
								</SelectTrigger>
								<SelectContent>
									{availableBadgesToAward.map((badge) => (
										<SelectItem key={badge.id} value={String(badge.id)}>
											{badge.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type='button' variant='outline' onClick={handleAwardBadge} disabled={!badgeToAward || isAwarding}>
								{isAwarding ? 'Awarding...' : 'Award'}
							</Button>
						</div>
					</div>

					<DialogFooter className='gap-2 pt-2'>
						{onDelete && (
							<Button type='button' variant='destructive' className='mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete
							</Button>
						)}
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
