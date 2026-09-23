'use client';

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
import { useToast } from '@/lib/hooks/use-toast';
import { SiCounterstrike } from 'react-icons/si';

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

	const onSubmit = async (data: any) => {
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
			} else if (response.status === 409) {
				toast({
					variant: 'destructive',
					title: 'Error',
					description: 'Failed to create team (Team name taken).',
				});
			} else {
				toast({
					variant: 'destructive',
					title: 'Error',
					description: 'Failed to create team.',
				});
			}
		} catch (error) {
			console.error(error);
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
				<button
					type='button'
					className='flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-neutral-600 bg-transparent px-4 text-center transition-colors hover:border-neutral-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
				>
					<SiCounterstrike aria-hidden className='h-10 w-10 text-neutral-300' />
					<span className='text-lg font-black uppercase tracking-wide text-white'>Create a team</span>
					<span className='text-sm text-muted-foreground'>You become captain and can invite up to 4 players.</span>
				</button>
			</DrawerTrigger>
			<DrawerContent>
				<div className='mx-auto w-full max-w-sm'>
					<DrawerHeader>
						<DrawerTitle className='text-center'>
							Create a New Team
						</DrawerTitle>
						<DrawerDescription className='text-center'>
							Fill in the details below to create a new team.
						</DrawerDescription>
					</DrawerHeader>
					<form
						onSubmit={handleSubmit(onSubmit)}
						className='p-4 pb-0 space-y-4 mb-10'
					>
						<div>
							<label
								htmlFor='team-name'
								className='block text-sm font-medium'
							>
								Team Name
							</label>
							<Input
								id='team-name'
								placeholder='Enter team name'
								{...register('teamName')}
								disabled={isSubmitting}
							/>
							{errors.teamName && (
								<p role='alert' className='mt-1 text-sm text-signal-live'>
									{String(errors.teamName.message)}
								</p>
							)}
						</div>
						<div className='space-x-2'>
							<Button
								className='w-[40%]'
								type='submit'
								disabled={isSubmitting}
							>
								{isSubmitting ? 'Creating...' : 'Create Team'}
							</Button>
							<DrawerClose asChild>
								<Button
									className='w-[56%] h-[42px]'
									type='button'
									variant='outline'
								>
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
