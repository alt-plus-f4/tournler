'use client';

import { SetStateAction, useEffect, useState } from 'react';
import type { Game } from '@prisma/client';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NicknameStep } from './onboarding/NicknameStep';
import { AvatarStep } from './onboarding/AvatarStep';
import { GamesStep } from './onboarding/GamesStep';
import { SteamStep } from './onboarding/SteamStep';
import { RiotStep } from './onboarding/RiotStep';
import { CompletedStep } from './onboarding/CompletedStep';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { completeOnboarding } from '@/lib/apifuncs';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/lib/onboarding-slice';
import { OnboardingShell } from './onboarding/OnboardingShell';

interface OnboardingDialogProps {
	isOpen: boolean;
}

enum OnboardingDialogSteps {
	Welcome,
	Nickname,
	Avatar,
	Games,
	Steam,
	Riot,
	Completed,
}

const STEP_TITLES: Record<OnboardingDialogSteps, string> = {
	[OnboardingDialogSteps.Welcome]: 'Welcome',
	[OnboardingDialogSteps.Nickname]: 'Nickname',
	[OnboardingDialogSteps.Avatar]: 'Avatar',
	[OnboardingDialogSteps.Games]: 'Your games',
	[OnboardingDialogSteps.Steam]: 'Steam',
	[OnboardingDialogSteps.Riot]: 'Riot ID',
	[OnboardingDialogSteps.Completed]: 'Completed',
};

/**
 * The step sequence for a given set of games: Steam only shows once CS2 is picked, Riot ID only
 * once League is picked. Before the Games step is answered (empty array), neither shows yet —
 * they appear as soon as the player picks a game, without waiting for the Games step to complete.
 */
function visibleSteps(games: Game[]) {
	const all = [
		OnboardingDialogSteps.Welcome,
		OnboardingDialogSteps.Nickname,
		OnboardingDialogSteps.Avatar,
		OnboardingDialogSteps.Games,
		OnboardingDialogSteps.Steam,
		OnboardingDialogSteps.Riot,
		OnboardingDialogSteps.Completed,
	];
	return all
		.filter((n) => n !== OnboardingDialogSteps.Steam || games.includes('CS2'))
		.filter((n) => n !== OnboardingDialogSteps.Riot || games.includes('LOL'))
		.map((number) => ({ number, title: STEP_TITLES[number] }));
}

export function OnboardingDialog({ isOpen }: OnboardingDialogProps) {
	const [open, setOpen] = useState(false);
	const currentStep = useSelector((store: any) => store.onboarding.currentStep);
	const dispatch = useDispatch();
	const { toast } = useToast();
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const [isStepLoading, setIsStepLoading] = useState(false);
	const [games, setGames] = useState<Game[]>([]);

	const steps = visibleSteps(games);

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
					const userGames: Game[] = Array.isArray(data.games) ? data.games : [];
					setGames(userGames);

					const completed: SetStateAction<number[]> = [];
					if (data.hasName) {
						completed.push(OnboardingDialogSteps.Welcome);
						completed.push(OnboardingDialogSteps.Nickname);
					}
					if (data.hasImage) completed.push(OnboardingDialogSteps.Avatar);
					if (userGames.length > 0) completed.push(OnboardingDialogSteps.Games);
					if (data.hasLinkedSteam) completed.push(OnboardingDialogSteps.Steam);
					if (data.hasLinkedRiot) completed.push(OnboardingDialogSteps.Riot);
					setCompletedSteps(completed);

					const nextStep = visibleSteps(userGames).find((step) => !completed.includes(step.number))?.number;
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

	async function handleStepCompletion(stepNumber: number, gamesOverride?: Game[]) {
		const nextCompleted = [...completedSteps, stepNumber];
		setCompletedSteps(nextCompleted);
		const next = visibleSteps(gamesOverride ?? games).find((step) => !nextCompleted.includes(step.number))?.number;
		dispatch(setCurrentStep(next ?? OnboardingDialogSteps.Completed));
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
			if (!response.ok) {
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
			if (!response.ok) {
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

	async function handleGames(selected: Game[]) {
		setIsStepLoading(true);
		try {
			const response = await fetch('/api/user/onboarding/games', {
				method: 'PATCH',
				body: JSON.stringify({ games: selected }),
				headers: { 'Content-Type': 'application/json' },
			});
			const json = await response.json();
			if (!response.ok) {
				toast({
					variant: 'destructive',
					title: json.error || 'An error occurred.',
					description: 'Please try again.',
				});
				setIsStepLoading(false);
				return;
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'An error occurred.',
				description: 'Please try again.',
			});
			console.error(error);
			setIsStepLoading(false);
			return;
		}
		setGames(selected);
		await handleStepCompletion(OnboardingDialogSteps.Games, selected);
		setIsStepLoading(false);
	}

	async function handleSteam() {
		setIsStepLoading(true);
		await handleStepCompletion(OnboardingDialogSteps.Steam);
		setIsStepLoading(false);
	}

	async function handleRiot() {
		setIsStepLoading(true);
		await handleStepCompletion(OnboardingDialogSteps.Riot);
		setIsStepLoading(false);
	}

	async function handleSkip() {
		setIsStepLoading(true);
		await handleStepCompletion(currentStep);
		setIsStepLoading(false);
	}

	const stepBefore = (target: OnboardingDialogSteps): OnboardingDialogSteps => {
		const list = visibleSteps(games);
		const idx = list.findIndex((s) => s.number === target);
		return (idx > 0 ? list[idx - 1].number : OnboardingDialogSteps.Welcome) as OnboardingDialogSteps;
	};

	const renderStep = () => {
		switch (currentStep) {
			case OnboardingDialogSteps.Welcome:
				return <WelcomeStep nextStep={handleWelcome} loading={isStepLoading} />;
			case OnboardingDialogSteps.Nickname:
				return <NicknameStep previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Welcome))} nextStep={(nickname: string) => handleNickname(nickname)} loading={isStepLoading} />;
			case OnboardingDialogSteps.Avatar:
				return <AvatarStep previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Nickname))} nextStep={(avatar: Blob) => handleAvatar(avatar)} loading={isStepLoading} />;
			case OnboardingDialogSteps.Games:
				return <GamesStep initialGames={games} previousStep={() => dispatch(setCurrentStep(OnboardingDialogSteps.Avatar))} nextStep={(selected: Game[]) => handleGames(selected)} loading={isStepLoading} />;
			case OnboardingDialogSteps.Steam:
				return <SteamStep previousStep={() => dispatch(setCurrentStep(stepBefore(OnboardingDialogSteps.Steam)))} nextStep={() => handleSteam()} />;
			case OnboardingDialogSteps.Riot:
				return <RiotStep previousStep={() => dispatch(setCurrentStep(stepBefore(OnboardingDialogSteps.Riot)))} nextStep={() => handleRiot()} />;
			case OnboardingDialogSteps.Completed:
				return <CompletedStep previousStep={() => dispatch(setCurrentStep(stepBefore(OnboardingDialogSteps.Completed)))} close={() => close()} />;
			default:
				return null;
		}
	};

	const renderSkipButton = () => {
		// Only if the current step has already been completed and it is not the final step: lets a
		// player who came back to review an earlier step move on again without resubmitting it.
		if (completedSteps.includes(currentStep) && currentStep !== OnboardingDialogSteps.Completed) {
			return (
				<div className='px-6 pb-8 text-center sm:px-12'>
					<Button variant='link' size='sm' onClick={handleSkip} disabled={isStepLoading} className='text-neutral-500 hover:text-white'>
						{isStepLoading ? 'Skipping…' : 'Skip this step'}
					</Button>
				</div>
			);
		}
		return null;
	};

	return (
		<Dialog open={open}>
			<OnboardingShell steps={steps} currentStep={currentStep} completedSteps={completedSteps}>
				{renderStep()}
				{renderSkipButton()}
			</OnboardingShell>
		</Dialog>
	);
}
