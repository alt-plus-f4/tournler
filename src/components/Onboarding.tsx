'use client';

import { SetStateAction, useEffect, useState } from 'react';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NicknameStep } from './onboarding/NicknameStep';
import { AvatarStep } from './onboarding/AvatarStep';
import { DiscordStep } from './onboarding/DiscordStep';
import { SteamStep } from './onboarding/SteamStep';
import { CompletedStep } from './onboarding/CompletedStep';
import { Dialog, DialogContent } from './ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { completeOnboarding } from '@/lib/apifuncs';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/lib/onboarding-slice';
import Step from './Steps';
import { DialogDescription } from '@radix-ui/react-dialog';

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
    const currentStep = useSelector(
        (store: any) => store.onboarding.currentStep
    );
    const dispatch = useDispatch();
    const { toast } = useToast();
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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
                    if (data.hasName){
                        completed.push(OnboardingDialogSteps.Welcome);
                        completed.push(OnboardingDialogSteps.Nickname);
                    }
                    if (data.hasImage)
                        completed.push(OnboardingDialogSteps.Avatar);
                    if (data.hasLinkedDiscord)
                        completed.push(OnboardingDialogSteps.Discord);
                    if (data.hasLinkedSteam)
                        completed.push(OnboardingDialogSteps.Steam);
                    setCompletedSteps(completed);

                    const nextStep = steps.find(
                        (step) => !completed.includes(step.number)
                    )?.number;
                    dispatch(setCurrentStep(nextStep ?? OnboardingDialogSteps.Completed));
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description:
                            data.error || 'Failed to fetch user status.',
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
        
        const nextStep = steps.find(
            (step) => !completedSteps.includes(step.number)
        )?.number;

        dispatch(setCurrentStep(nextStep ?? OnboardingDialogSteps.Completed));
    }

    async function setName(nickname: string) {
        try {
            const response = await fetch('/api/user/nickname', {
                method: 'PATCH',
                body: JSON.stringify({ name: nickname }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const json = await response.json();

            if (response.ok) {
                setCompletedSteps((prev) => [
                    ...prev,
                    OnboardingDialogSteps.Nickname,
                ]);
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
    }

    async function setAvatar(avatar: Blob) {
        const avatarText = await avatar.text();
        console.log('avatar', avatar);

        try {
            const response = await fetch('/api/user/avatar', {
                method: 'PATCH',
                body: JSON.stringify({ avatar: avatarText }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const json = await response.json();

            if (response.ok) {
                setCompletedSteps((prev) => [
                    ...prev,
                    OnboardingDialogSteps.Avatar,
                ]);
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
    }

    const renderStep = () => {
        switch (currentStep) {
            case OnboardingDialogSteps.Welcome:
                return (
                    <WelcomeStep
                        nextStep={() => handleStepCompletion(OnboardingDialogSteps.Welcome)}
                    />
                );
            case OnboardingDialogSteps.Nickname:
                return (
                    <NicknameStep
                        previousStep={() =>
                            dispatch(setCurrentStep(OnboardingDialogSteps.Welcome))
                        }
                        nextStep={(nickname: string) => {
                            setName(nickname).then(() => handleStepCompletion(OnboardingDialogSteps.Nickname));
                        }}
                    />
                );
            case OnboardingDialogSteps.Avatar:
                return (
                    <AvatarStep
                        previousStep={() =>
                            dispatch(setCurrentStep(OnboardingDialogSteps.Nickname))
                        }
                        nextStep={(avatar: Blob) => {
                            setAvatar(avatar).then(() => handleStepCompletion(OnboardingDialogSteps.Avatar));
                        }}
                    />
                );
            case OnboardingDialogSteps.Discord:
                return (
                    <DiscordStep
                        previousStep={() =>
                            dispatch(setCurrentStep(OnboardingDialogSteps.Avatar))
                        }
                        nextStep={() => handleStepCompletion(OnboardingDialogSteps.Discord)}
                    />
                );
            case OnboardingDialogSteps.Steam:
                return (
                    <SteamStep
                        previousStep={() =>
                            dispatch(setCurrentStep(OnboardingDialogSteps.Discord))
                        }
                        nextStep={() => handleStepCompletion(OnboardingDialogSteps.Steam)}
                    />
                );
            case OnboardingDialogSteps.Completed:
                return (
                    <CompletedStep
                        previousStep={() =>
                            dispatch(setCurrentStep(OnboardingDialogSteps.Steam))
                        }
                        close={() => close()}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Dialog open={open}>
                <DialogContent className="max-w-max">
                    <DialogDescription></DialogDescription>
                    <div className="flex flex-row py-5">
                        <div className="flex flex-col space-between py-8 bg-white bg-opacity-[0.01] rounded-lg">
                            {steps.map((step) => (
                                <Step
                                    key={step.number}
                                    step={step}
                                    completed={completedSteps.includes(step.number)}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col m-auto">{renderStep()}</div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}