import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FaDiscord } from 'react-icons/fa';
import { DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DiscordStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

export function DiscordStep({ previousStep, nextStep }: DiscordStepProps) {
	return (
		<>
			<div
				className='flex flex-col sm:px-32 sm:py-20 m-1 items-center text-center w-full cursor-pointer transition-300 hover:bg-discordColor rounded-md'
				onClick={() => signIn('discord', { callbackUrl: '/' })}
			>
				<FaDiscord className='sm:w-40 sm:h-40' />
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
				<Button onClick={nextStep} className='sm:w-48'>
					Continue
				</Button>
			</DialogFooter>
		</>
	);
}
