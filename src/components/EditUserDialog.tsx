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
import { User } from '@/types/types';
import { Checkbox } from './ui/checkbox';

const userTypes = ['USER', 'ADMIN'] as const;

interface EditUserDialogProps {
	user: User | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedUser: User) => void;
}

export default function EditUserDialog({
	user,
	isOpen,
	onClose,
	onSave,
}: EditUserDialogProps) {
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [updatedFields, setUpdatedFields] = useState<Partial<User>>({});
	const { toast } = useToast();

	useEffect(() => {
		if (user) {
			setEditingUser(user);
			setUpdatedFields({});
		}
	}, [user]);

	const handleChange = (field: keyof User, value: any) => {
		setEditingUser((prev) => (prev ? { ...prev, [field]: value } : null));
		setUpdatedFields((prev) => ({ ...prev, [field]: value }));
	};

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser || Object.keys(updatedFields).length === 0) {
			toast({
				title: 'No Changes',
				description: 'No changes were made to the user.',
				variant: 'default',
			});
			return;
		}

		const response = await fetch(`/api/users/${editingUser.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updatedFields),
		});

		if (response.ok) {
			toast({
				title: 'Success',
				description: 'User updated successfully',
				variant: 'default',
			});
			onSave({ ...editingUser, ...updatedFields });
			onClose();
		} else {
			toast({
				title: 'Error',
				description: 'Failed to update user',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Edit User</DialogTitle>
					<DialogDescription>
						Update the user details.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleEdit} className='space-y-2'>
					<Label htmlFor='edit-name'>Name</Label>
					<Input
						id='edit-name'
						value={editingUser?.name || ''}
						onChange={(e) => handleChange('name', e.target.value)}
						required
					/>
					<Label htmlFor='edit-email'>Email</Label>
					<Input
						id='edit-email'
						type='email'
						value={editingUser?.email || ''}
						onChange={(e) => handleChange('email', e.target.value)}
						required
					/>
					<Label htmlFor='edit-image'>Image URL</Label>
					<Input
						id='edit-image'
						value={editingUser?.image || ''}
						onChange={(e) => handleChange('image', e.target.value)}
					/>
					<Label htmlFor='edit-emailVerified'>Email Verified</Label>
					<Input
						id='edit-emailVerified'
						type='datetime-local'
						value={
							editingUser?.emailVerified
								? new Date(editingUser.emailVerified)
										.toISOString()
										.slice(0, 16)
								: ''
						}
						onChange={(e) =>
							handleChange('emailVerified', e.target.value)
						}
					/>
					<Label htmlFor='edit-role'>Role</Label>
					<select
						id='edit-role'
						value={editingUser?.role || ''}
						onChange={(e) => handleChange('role', e.target.value)}
						className='border rounded p-2 w-full bg-black text-white'
					>
						{userTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
					<div className='flex flex-row justify-between py-2'>
						<Label htmlFor='edit-onboarding'>
							Onboarding Completed
						</Label>
						<Checkbox
							id='edit-onboarding'
							checked={editingUser?.isOnboardingCompleted || false}
							onCheckedChange={(checked) =>
								handleChange('isOnboardingCompleted', checked)
							}
						/>
					</div>
					<Button type='submit' className='w-full'>
						Update User
					</Button>
				</form>
				<DialogClose asChild>
					<Button variant='outline'>Close</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
