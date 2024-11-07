'use client';

import React from 'react';
import { LuPartyPopper } from 'react-icons/lu';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface CompletedStepProps {
  previousStep: () => void;
  close: () => void;
}

export function CompletedStep({ previousStep, close }: CompletedStepProps) {
  return (
    <>
      <div className="flex flex-col items-center text-center w-full">
        <LuPartyPopper className="w-52 h-52" />
        <h1 className="text-lg font-semibold uppercase">Completed Onboarding</h1>
        <p>Completed Step</p>
      </div>
      <DialogFooter className="flex mt-2 gap-y-1 sm:gap-y-0 content-center">
        <Button type="button" onClick={previousStep} variant="secondary">
          Previous
        </Button>
        <Button type="button" onClick={close}>
          <LuPartyPopper className="mr-2 h-4 w-4" />
          Done
        </Button>
      </DialogFooter>
    </>
  );
}