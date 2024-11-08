'use client';

import { useEffect, useState } from 'react';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { AvatarStep } from './onboarding/AvatarStep';
import { DiscordStep } from './onboarding/DiscordStep';
import { SteamStep } from './onboarding/SteamStep';
import { CompletedStep } from './onboarding/CompletedStep';
import { Dialog, DialogContent } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from '@/lib/apifuncs';

interface OnboardingDialogProps {
    isOpen: boolean;
}

enum OnboardingDialogSteps {
    Welcome,
    Avatar,
    Discord,
    Steam,
    Completed,
}

export function OnboardingDialog({ isOpen }: OnboardingDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(OnboardingDialogSteps.Welcome);
    const { toast } = useToast();

    useEffect(() => {
        const timer = setTimeout(() => {
            setOpen(isOpen);
        }, 1000);

        return () => clearTimeout(timer);
    }, [isOpen]);

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

    async function setAvatar(avatar: File) {
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
                setStep(OnboardingDialogSteps.Discord);
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
            //! #REMOVE
            console.error(error);
        }
    }

    const renderStep = () => {
        switch (step) {
            case OnboardingDialogSteps.Welcome:
                return (
                    <WelcomeStep nextStep={() => setStep(OnboardingDialogSteps.Avatar)} />
                );
            case OnboardingDialogSteps.Avatar:
                return (
                    <AvatarStep
                        previousStep={() => setStep(OnboardingDialogSteps.Welcome)}
                        nextStep={(avatar: File) => setAvatar(avatar)}
                    />
                );
            case OnboardingDialogSteps.Discord:
                return (
                    <DiscordStep
                        previousStep={() => setStep(OnboardingDialogSteps.Avatar)}
                        nextStep={() => setStep(OnboardingDialogSteps.Steam)}
                    />
                );
            case OnboardingDialogSteps.Steam:
                return (
                    <SteamStep
                        previousStep={() => setStep(OnboardingDialogSteps.Discord)}
                        nextStep={() => setStep(OnboardingDialogSteps.Completed)}
                    />
                );
            case OnboardingDialogSteps.Completed:
                return (
                    <CompletedStep
                        previousStep={() => setStep(OnboardingDialogSteps.Steam)}
                        close={() => close()}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={() => setOpen(false)}>
                <DialogContent className="max-w-2xl">{renderStep()}</DialogContent>
            </Dialog>
        </>
    );
}