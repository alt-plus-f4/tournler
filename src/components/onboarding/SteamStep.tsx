'use client';

import { SteamSymbolIcon } from '@/components/Icons';
import { useToast } from '@/lib/hooks/use-toast';
import { StepHeading, StepFooter } from './StepChrome';

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
		<div className='flex flex-1 flex-col px-6 py-10 sm:px-12'>
			<StepHeading title='Link your Steam account' description="You'll sign in on Steam and come straight back here." />

			<button
				type='button'
				onClick={handleSteamLogin}
				className='flex w-full flex-col items-center gap-4 rounded-md border border-border bg-black/40 px-6 py-12 text-center transition-colors hover:border-neutral-600 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
			>
				<span className='flex h-20 w-20 items-center justify-center rounded-full border border-border'>
					<SteamSymbolIcon aria-hidden className='h-10 w-10 text-white' />
				</span>
				<span className='text-sm font-bold uppercase tracking-wide text-white'>Sign in with Steam</span>
			</button>

			<StepFooter onPrevious={previousStep} onNext={nextStep} nextLabel='Skip for now' />
		</div>
	);
}
