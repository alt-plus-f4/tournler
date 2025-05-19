'use client';

import { SetStateAction, useEffect, useState } from 'react';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NicknameStep } from './onboarding/NicknameStep';
import { AvatarStep } from './onboarding/AvatarStep';
import { DiscordStep } from './onboarding/DiscordStep';
import { SteamStep } from './onboarding/SteamStep';
import { CompletedStep } from './onboarding/CompletedStep';
import { Dialog, DialogContent, DialogHeader } from './ui/dialog';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Button } from './ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { completeOnboarding } from '@/lib/apifuncs';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/lib/onboarding-slice';
import Step from './Steps';

interface OnboardingDialogProps {
  isOpen: boolean;
}

enum OnboardingDialogSteps {
  Welcome,
  Nickname,
  Avatar,
  Discord,
  Steam,
  Completed,
}

const steps = [
  { number: 0, title: 'Welcome', completed: false },
  { number: 1, title: 'Nickname', completed: false },
  { number: 2, title: 'Avatar', completed: false },
  { number: 3, title: 'Discord', completed: false },
  { number: 4, title: 'Steam', completed: false },
  { number: 5, title: 'Completed', completed: false },
];

export function OnboardingDialog({ isOpen }: OnboardingDialogProps) {
  const [open, setOpen] = useState(false);
  const currentStep = useSelector((store: any) => store.onboarding.currentStep);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isStepLoading, setIsStepLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(isOpen);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    async function checkUserStatus() {
      try {
        const response = await fetch('/api/user/onboarding/status');
        const data = await response.json();

        if (response.ok) {
          const completed: SetStateAction<number[]> = [];
          if (data.hasName) {
            completed.push(OnboardingDialogSteps.Welcome);
            completed.push(OnboardingDialogSteps.Nickname);
          }
          if (data.hasImage) completed.push(OnboardingDialogSteps.Avatar);
          if (data.hasLinkedDiscord) completed.push(OnboardingDialogSteps.Discord);
          if (data.hasLinkedSteam) completed.push(OnboardingDialogSteps.Steam);
          setCompletedSteps(completed);

          const nextStep = steps.find((step) => !completed.includes(step.number))?.number;
          dispatch(setCurrentStep(nextStep ?? OnboardingDialogSteps.Completed));
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.error || 'Failed to fetch user status.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.' + error,
        });
      }
    }

    checkUserStatus();
  }, [toast]);

  async function close() {
    const response = await completeOnboarding();
    if (response?.error) {
      toast({
        variant: 'destructive',
        title: response.error,
        description: 'Please try again.',
      });
    } else {
      setOpen(false);
    }
  }

  async function handleStepCompletion(stepNumber: number) {
    setCompletedSteps((prev) => [...prev, stepNumber]);
    steps[stepNumber].completed = true;
    const nextStep = steps.find((step) => ![...completedSteps, stepNumber].includes(step.number))?.number;
    dispatch(setCurrentStep(nextStep ?? OnboardingDialogSteps.Completed));
  }

  async function handleWelcome() {
    setIsStepLoading(true);
    await handleStepCompletion(OnboardingDialogSteps.Welcome);
    setIsStepLoading(false);
  }

  async function handleNickname(nickname: string) {
    setIsStepLoading(true);
    try {
      const response = await fetch('/api/user/nickname', {
        method: 'PATCH',
        body: JSON.stringify({ name: nickname }),
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (response.ok) {
        setCompletedSteps((prev) => [...prev, OnboardingDialogSteps.Nickname]);
        dispatch(setCurrentStep(OnboardingDialogSteps.Avatar));
      } else {
        toast({
          variant: 'destructive',
          title: json.message || 'An error occurred.',
          description: 'Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Please try again.',
      });
      console.error(error);
    }
    await handleStepCompletion(OnboardingDialogSteps.Nickname);
    setIsStepLoading(false);
  }

  async function handleAvatar(avatar: Blob) {
    setIsStepLoading(true);
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: await avatar.text() }),
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (response.ok) {
        setCompletedSteps((prev) => [...prev, OnboardingDialogSteps.Avatar]);
        dispatch(setCurrentStep(OnboardingDialogSteps.Discord));
      } else {
        toast({
          variant: 'destructive',
          title: json.message || 'An error occurred.',
          description: 'Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred.',
        description: 'Please try again.',
      });
      console.error(error);
    }
    await handleStepCompletion(OnboardingDialogSteps.Avatar);
    setIsStepLoading(false);
  }

  async function handleDiscord() {
    setIsStepLoading(true);
    await handleStepCompletion(OnboardingDialogSteps.Discord);
    setIsStepLoading(false);
  }

  async function handleSteam() {
    setIsStepLoading(true);
    await handleStepCompletion(OnboardingDialogSteps.Steam);
    setIsStepLoading(false);
  }

  async function handleSkip() {
    setIsStepLoading(true);
    await handleStepCompletion(currentStep);
    setIsStepLoading(false);
  }

  const renderStep = () => {
    switch (currentStep) {
      case OnboardingDialogSteps.Welcome:
        return <WelcomeStep nextStep={handleWelcome} loading={isStepLoading} />;
      case OnboardingDialogSteps.Nickname:
        return (
          <NicknameStep
            previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Welcome))}
            nextStep={(nickname: string) => handleNickname(nickname)}
            loading={isStepLoading}
          />
        );
      case OnboardingDialogSteps.Avatar:
        return (
          <AvatarStep
            previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Nickname))}
            nextStep={(avatar: Blob) => handleAvatar(avatar)}
            loading={isStepLoading}
          />
        );
      case OnboardingDialogSteps.Discord:
        return (
          <DiscordStep
            previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Avatar))}
            nextStep={() => handleDiscord()}
          />
        );
      case OnboardingDialogSteps.Steam:
        return (
          <SteamStep
            previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Discord))}
            nextStep={() => handleSteam()}
          />
        );
      case OnboardingDialogSteps.Completed:
        return (
          <CompletedStep
            previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Steam))}
            close={() => close()}
          />
        );
      default:
        return null;
    }
  };

  const renderSkipButton = () => {
    // Render the skip button only if the current step has already been completed and it is not the final step.
    if (completedSteps.includes(currentStep) && currentStep !== OnboardingDialogSteps.Completed) {
      return (
        <Button
          variant="outline"
          onClick={handleSkip}
          className="mt-4 w-[30%] sm:w-[80%] mx-auto"
          disabled={isStepLoading}
        >
          {isStepLoading ? 'Skipping...' : 'Skip'}
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <Dialog open={open}>
        <DialogHeader>
          <DialogTitle className="hidden">
            Onboarding
          </DialogTitle>
        </DialogHeader>

        <DialogContent className="max-w-max">
          <DialogDescription></DialogDescription>
          <div className="flex flex-row py-5">
            <div className="flex flex-col space-between py-8 bg-white bg-opacity-[0.01] rounded-lg">
              {steps.map((step) => (
                <Step key={step.number} step={step} completed={completedSteps.includes(step.number)} />
              ))}
            </div>

            <div className="flex flex-col m-auto">
              {renderStep()}
              {renderSkipButton()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}