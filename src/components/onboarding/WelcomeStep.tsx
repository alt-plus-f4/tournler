'use client';

import React from 'react';
import { Icons } from '../Icons';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface WelcomeStepProps {
  nextStep: () => void;
}

export function WelcomeStep({ nextStep }: WelcomeStepProps) {
  return (
    <>
      <div className="flex flex-col items-center text-center w-full">
        <Icons.logo size={208} />
        <h1 className="text-lg font-semibold uppercase">welcome to Tues gaming</h1>
        <p>First you have to complete the onboarding</p>
      </div>
      <DialogFooter>
        <Button type="button" onClick={nextStep}>
          Continue
        </Button>
      </DialogFooter>
    </>
  );
}