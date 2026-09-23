'use client';

import { FaSteamSymbol } from 'react-icons/fa6';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';

interface SteamStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

export function SteamStep({ previousStep, nextStep }: SteamStepProps) {
	const { toast } = useToast();

	// Initiates the Steam login by calling the backend
	const handleSteamLogin = async () => {
		try {
			const response = await fetch('/api/auth/steam'); // This calls the backend route that handles the redirect

			if (!response.ok) {
				toast({
					variant: 'destructive',
					title: 'Login Error',
					description: 'Failed to initiate Steam login.',
				});
				return;
			}

			const data = await response.json();
			const steamLoginUrl = data.url;

			if (!steamLoginUrl) {
				toast({
					variant: 'destructive',
					title: 'Login Error',
					description: 'Steam login URL was not returned.',
				});
				return;
			}

			window.location.href = steamLoginUrl;

			// Open the Steam login URL in a new tab
			//   window.open(steamLoginUrl, '_blank');
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Login Error',
				description: 'An error occurred while initiating Steam login.',
			});
			console.error(error);
		}
	};

	return (
		<>
			<h2 className='text-center text-2xl font-semibold'>Link your Steam account</h2>
			<p className='mt-1 text-center text-sm text-muted-foreground'>You&apos;ll sign in on Steam and come straight back here.</p>
			<button
				type='button'
				onClick={handleSteamLogin}
				className='m-1 mt-4 flex w-full flex-col items-center gap-3 rounded-md border border-border p-6 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-32 sm:py-16'
			>
				<FaSteamSymbol aria-hidden className='h-16 w-16 sm:h-32 sm:w-32' />
				<span className='text-base font-medium'>Sign in with Steam</span>
			</button>

			<DialogFooter className='flex mt-8 justify-around'>
				<Button onClick={previousStep} variant='secondary' className='sm:w-48'>
					Previous
				</Button>
				<Button onClick={nextStep} variant='outline' className='sm:w-48'>
					Skip for now
				</Button>
			</DialogFooter>
		</>
	);
}
