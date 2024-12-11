"use client";

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
	teamName: z
		.string()
		.min(3, 'Team name must be at least 3 characters long')
		.max(50, 'Team name cannot exceed 50 characters'),
});

export function TeamCreationDrawer() {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(formSchema),
	});
	const router = useRouter();
	const { toast } = useToast();

	const onSubmit = async (data : any) => {
		try {
			const response = await fetch('/api/teams', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				toast({
					title: 'Created Team',
					description: "You've successfully created a new team.",
				});
				router.refresh();
			} else {
				const errorData = await response.json();
				toast({
					variant: 'destructive',
					title: 'Error',
					description: errorData || 'Failed to create team.',
				});
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to create team.',
			});
		}
	};

	return (
		<Drawer>
			<DrawerTrigger asChild>
				<Button variant="outline">Create Team</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full max-w-sm">
					<DrawerHeader>
						<DrawerTitle className="text-center" >Create a New Team</DrawerTitle>
						<DrawerDescription className="text-center" >
							Fill in the details below to create a new team.
						</DrawerDescription>
					</DrawerHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="p-4 pb-0 space-y-4 mb-10">
						<div>
							<label htmlFor="team-name" className="block text-sm font-medium">
								Team Name
							</label>
							<Input
								id="team-name"
								placeholder="Enter team name"
								{...register('teamName')}
								disabled={isSubmitting}
							/>
							{errors.teamName && (
								<p className="text-red-600 text-sm">{String(errors.teamName.message)}</p>
							)}
						</div>
						<div className="space-x-2">
							<Button className='w-[40%]' type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Creating...' : 'Create Team'}
							</Button>
							<DrawerClose asChild>
								<Button className='w-[56%] h-[42px]' type="button" variant="outline">
									Cancel
								</Button>
							</DrawerClose>
						</div>
					</form>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

export default TeamCreationDrawer;

