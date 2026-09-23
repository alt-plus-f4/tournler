'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProps {
	step: {
		number: number;
		title: string;
	};
	completed: boolean;
}

export default function Step({ step, completed }: StepProps) {
	const { number, title } = step;
	const currentStep = useSelector((store: { onboarding: { currentStep: number } }) => store.onboarding.currentStep);
	const isCurrent = number === currentStep;

	return (
		<li aria-current={isCurrent ? 'step' : undefined} className='my-4 flex flex-col items-center gap-3 px-10 md:flex-row'>
			<div
				className={cn(
					'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-mono text-sm font-bold tabular-nums',
					isCurrent ? 'border-foreground bg-foreground text-background' : completed ? 'border-foreground text-foreground' : 'border-border text-muted-foreground',
				)}
			>
				{completed && !isCurrent ? <Check aria-hidden className='h-4 w-4' /> : number + 1}
			</div>
			<div className='flex flex-col justify-center'>
				<span className='text-xs uppercase tracking-widest text-muted-foreground'>
					Step {number + 1}
					{completed && <span className='sr-only'>, done</span>}
				</span>
				<span className={cn('text-sm font-bold uppercase', isCurrent ? 'text-foreground' : 'text-neutral-300')}>{title}</span>
			</div>
		</li>
	);
}
