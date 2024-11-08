'use client';

import React from 'react';
import { Icons } from '../Icons';
import { DialogDescription, DialogFooter, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

interface WelcomeStepProps {
  nextStep: () => void;
}

export function WelcomeStep({ nextStep }: WelcomeStepProps) {
  return (
    <>
      <div className="flex flex-col items-center text-center w-full">
        <Icons.logo size={128} />
        <DialogTitle className='text-xl font-bold mt-4 mb-2'>Добре Дошли в Tues gaming</DialogTitle>
        <DialogDescription className='text-base italic'>Първо трябва да минеш през няколко стъпки</DialogDescription>
      </div>
      <DialogFooter className='flex justify-end'>
        <Button variant={'default'} onClick={nextStep}>
          Продължи
        </Button>
      </DialogFooter>
    </>
  );
}