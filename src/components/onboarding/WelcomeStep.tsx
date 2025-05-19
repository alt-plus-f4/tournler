'use client';

import React from 'react';
import { Icons } from '../Icons';
import { DialogFooter, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

interface WelcomeStepProps {
	nextStep: () => void;
  nextStep: () => void;
  loading: boolean;
}

export function WelcomeStep({ nextStep }: WelcomeStepProps) {
	return (
		<div className='p-24'>
			<div className='flex flex-col items-center text-center w-full'>
				<Icons.logo size={128} />
				<DialogTitle className='text-xl font-bold mt-4 mb-2'>
					Welcome to Tues gaming
				</DialogTitle>
			</div>
			<DialogFooter className='flex mt-4 justify-center'>
				<Button variant='default' onClick={nextStep}>
					Continue
				</Button>
			</DialogFooter>
		</div>
	);
export function WelcomeStep({ nextStep, loading }: WelcomeStepProps) {
  return (
    <div className='p-24'>
      <div className="flex flex-col items-center text-center w-full">
        <Icons.logo size={128} />
        <DialogTitle className="text-xl font-bold mt-4 mb-2">
          Добре Дошли в Tues gaming
        </DialogTitle>
      </div>
      <DialogFooter className="flex mt-4 justify-center">
        <Button variant="default" onClick={nextStep} disabled={loading}>
          {loading ? 'Loading...' : 'Продължи'}
        </Button>
      </DialogFooter>
    </div>
  );
}
