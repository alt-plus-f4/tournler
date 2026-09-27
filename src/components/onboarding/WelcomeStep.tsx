'use client';

import { Icons } from '../Icons';
import { StepFooter } from './StepChrome';

interface WelcomeStepProps {
	nextStep: () => void;
	loading: boolean;
}

export function WelcomeStep({ nextStep, loading }: WelcomeStepProps) {
	return (
		<div className='flex flex-1 flex-col justify-center px-6 py-10 sm:px-12'>
			<div className='flex flex-col items-center text-center'>
				<span className='flex h-20 w-20 items-center justify-center rounded-full border border-border bg-white/5'>
					<Icons.logo size={44} aria-hidden />
				</span>
				<h1 className='mt-6 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl'>Welcome to Tournler</h1>
				<p className='mt-3 max-w-sm text-sm text-neutral-400'>Three quick steps: pick a nickname, make an avatar, and link your Steam account.</p>
			</div>
			<StepFooter onNext={nextStep} nextLabel='Get started' nextLoadingLabel='Loading…' loading={loading} />
		</div>
	);
}
