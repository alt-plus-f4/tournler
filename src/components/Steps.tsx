'use client';

import React from 'react';
import { useSelector } from 'react-redux';

interface StepProps {
	step: {
		number: number;
		title: string;
	};
	completed: boolean;
}

export default function Step({ step, completed }: StepProps) {
	const { number, title } = step;
	const currentStep = useSelector(
		(store: { onboarding: { currentStep: number } }) =>
			store.onboarding.currentStep
	);
	return (
		<div className='flex flex-col md:flex-row items-center gap-3 my-4 px-10'>
			<div
				className={`w-8 h-8 text-slate-50 border border-slate-50 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
					number === currentStep
						? 'bg-slate-300 border-0'
						: completed
						? 'bg-slate-300 border-0'
						: ''
				}`}
			>
				{completed ? '✓' : number}
			</div>
			<div className='flex-col flex justify-center'>
				<h4 className='text-slate-200 text-sm uppercase'>
					Step {number}
				</h4>
				<h3 className='uppercase text-sm text-white font-bold'>
					{title}
				</h3>
			</div>
		</div>
	);
}
