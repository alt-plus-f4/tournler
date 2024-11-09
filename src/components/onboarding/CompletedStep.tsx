'use client';

import React from 'react';
import { LuPartyPopper } from 'react-icons/lu';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';

interface CompletedStepProps {
  previousStep: () => void;
  close: () => void;
}

export function CompletedStep({ previousStep, close }: CompletedStepProps) {
  const formData = useSelector((store: { onboarding: { formData: { nickname: string; games: string[] } } }) => store.onboarding.formData);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Onboarding Completed</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col items-center text-center w-full">
        <LuPartyPopper className="w-52 h-52" />
        <h1 className="text-lg font-semibold uppercase">Congratulations!</h1>
        <p>You have successfully completed the onboarding process.</p>
        <div className="mt-4">
          <h2 className="text-md font-semibold">Summary</h2>
          <p><strong>Nickname:</strong> {formData.nickname}</p>
          <p><strong>Games:</strong> {formData.games.join(', ')}</p>
        </div>
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