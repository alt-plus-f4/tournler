'use client';

import { Check } from 'lucide-react';
import { StepFooter } from './StepChrome';

interface CompletedStepProps {
	previousStep: () => void;
	close: () => void;
}

export function CompletedStep({ previousStep, close }: CompletedStepProps) {
	return (
		<div className='flex flex-1 flex-col justify-center px-6 py-10 sm:px-12'>
			<div className='flex flex-col items-center text-center'>
				<span className='flex h-20 w-20 items-center justify-center rounded-full border border-white bg-white text-black shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'>
					<Check className='h-9 w-9' aria-hidden strokeWidth={2.5} />
				</span>
				<h1 className='mt-6 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl'>You&apos;re set up</h1>
				<p className='mt-3 max-w-sm text-sm text-neutral-400'>Your profile is ready. Join a team or find a tournament to play in.</p>
			</div>
			<StepFooter onPrevious={previousStep} onNext={close} nextLabel='Done' />
		</div>
	);
}
