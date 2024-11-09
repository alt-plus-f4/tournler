'use client';

import { useEffect, useState } from 'react';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NicknameStep } from './onboarding/NicknameStep';
import { AvatarStep } from './onboarding/AvatarStep';
import { DiscordStep } from './onboarding/DiscordStep';
import { SteamStep } from './onboarding/SteamStep';
import { CompletedStep } from './onboarding/CompletedStep';
import { Dialog, DialogContent } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
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
	{ number: 0, title: 'Welcome' },
	{ number: 1, title: 'Nickname' },
	{ number: 2, title: 'Avatar' },
	{ number: 3, title: 'Discord' },
	{ number: 4, title: 'Steam' },
	{ number: 5, title: 'Completed' },
];

export function OnboardingDialog({ isOpen }: OnboardingDialogProps) {
	const [open, setOpen] = useState(false);
	const currentStep = useSelector(
		(store: any) => store.onboarding.currentStep
	);
	const dispatch = useDispatch();
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
			//! #REMOVE
			console.error(error);
		}
	}

	const renderStep = () => {
		switch (currentStep) {
			case OnboardingDialogSteps.Welcome:
				return (
					<WelcomeStep
						nextStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Nickname)
							)
						}
					/>
				);
			case OnboardingDialogSteps.Nickname:
				return (
					<NicknameStep
						previousStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Welcome)
							)
						}
						nextStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Avatar)
							)
						}
					/>
				);
			case OnboardingDialogSteps.Avatar:
				return (
					<AvatarStep
						previousStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Nickname)
							)
						}
						nextStep={(avatar: File) => setAvatar(avatar)}
					/>
				);
			case OnboardingDialogSteps.Discord:
				return (
					<DiscordStep
						previousStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Avatar)
							)
						}
						nextStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Steam)
							)
						}
					/>
				);
			case OnboardingDialogSteps.Steam:
				return (
					<SteamStep
						previousStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Discord)
							)
						}
						nextStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Completed)
							)
						}
					/>
				);
			case OnboardingDialogSteps.Completed:
				return (
					<CompletedStep
						previousStep={() =>
							dispatch(
								setCurrentStep(OnboardingDialogSteps.Steam)
							)
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
				<DialogContent className='max-w-max'>
					<DialogDescription></DialogDescription>
					<div className='flex flex-row py-5'>
						<div className='flex flex-col space-between py-8 bg-white bg-opacity-[0.01] rounded-lg'>
							{steps.map((step) => (
								<Step key={step.number} step={step} />
							))}
						</div>

						<div className='flex flex-col m-auto'>
							{renderStep()}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
