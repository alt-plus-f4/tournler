import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FaDiscord } from 'react-icons/fa';
import { DialogFooter } from '@/components/ui/dialog';

interface DiscordStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

export function DiscordStep({ previousStep, nextStep }: DiscordStepProps) {
	return (
		<>
			<button
				type='button'
				className='m-1 flex w-full flex-col items-center gap-3 rounded-md border border-border p-6 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-32 sm:py-20'
				onClick={() => signIn('discord', { callbackUrl: '/' })}
			>
				<FaDiscord aria-hidden className='h-16 w-16 sm:h-40 sm:w-40' />
				<span className='text-2xl font-semibold'>Log in with Discord</span>
			</button>

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
