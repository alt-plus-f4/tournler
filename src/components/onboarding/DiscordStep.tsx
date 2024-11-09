'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FaCheck, FaDiscord } from 'react-icons/fa';
import { DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DiscordStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

export function DiscordStep({ previousStep, nextStep }: DiscordStepProps) {
	const [isDiscordAccountLinked, setIsDiscordAccountLinked] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		async function updateDiscordAccountStatus() {
			try {
				const response = await fetch('/api/user/discord');
				const data = await response.json();

				if (response.ok) {
					setIsDiscordAccountLinked(data.hasLinkedDiscord);
				} else {
					toast({
						variant: 'destructive',
						title: 'Error',
						description:
							data.error ||
							'Failed to fetch Discord account status.',
					});
				}
			} catch (error) {
				toast({
					variant: 'destructive',
					title: 'Error',
					description: 'An unexpected error occurred.',
				});
				// ! #REMOVE
				console.error(error);
			}
		}

		updateDiscordAccountStatus();
	}, []);

	return (
		<>
			<div
				className='flex flex-col px-32 py-20 m-1 items-center text-center w-full cursor-pointer transition-300 hover:bg-discordColor rounded-md'
				onClick={() => signIn('discord')}
			>
				{isDiscordAccountLinked ? (
					<FaCheck className='w-40 h-40' />
				) : (
					<FaDiscord className='w-40 h-40' />
				)}
				<DialogTitle className='text-2xl font-semibold'>
					Log in with Discord
				</DialogTitle>
			</div>

			<DialogFooter className='flex mt-8 justify-around'>
				<Button
					onClick={previousStep}
					variant='secondary'
					className='sm:w-48'
				>
					Previous
				</Button>
				{isDiscordAccountLinked ? (
					<Button onClick={nextStep} className='sm:w-48'>
						Continue
					</Button>
				) : (
					<Button
						onClick={nextStep}
						variant={'default'}
						className='sm:w-48'
					>
						Skip
					</Button>
				)}
			</DialogFooter>
		</>
	);
}
