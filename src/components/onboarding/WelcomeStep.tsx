'use client';

import React from 'react';
import { Icons } from '../Icons';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface WelcomeStepProps {
	nextStep: () => void;
	loading: boolean;
}

export function WelcomeStep({ nextStep, loading }: WelcomeStepProps) {
	return (
		<div className='p-8 sm:p-24'>
			<div className='flex flex-col items-center text-center w-full'>
				<Icons.logo size={128} aria-hidden />
				<h2 className='mt-4 mb-2 text-xl font-bold'>Welcome to Tournler</h2>
				<p className='max-w-sm text-sm text-muted-foreground'>Three quick steps: pick a nickname, make an avatar, and link your Steam account.</p>
			</div>
			<DialogFooter className='flex mt-4 justify-center'>
				<Button variant='default' onClick={nextStep} disabled={loading}>
					{loading ? 'Loading…' : 'Get started'}
				</Button>
			</DialogFooter>
		</div>
	);
}
