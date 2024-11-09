'use client';

import { FaCheck, FaSteamSymbol } from 'react-icons/fa6';
import React, { useEffect, useState } from 'react';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { signIn } from 'next-auth/react';

interface SteamStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

export function SteamStep({ previousStep, nextStep }: SteamStepProps) {
	const [isSteamAccountLinked, setIsSteamAccountLinked] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		async function updateSteamAccountStatus() {
			try {
				const response = await fetch('/api/user/steam');
				const data = await response.json();

				if (response.ok) {
					setIsSteamAccountLinked(data.hasLinkedSteam);
				} else {
					toast({
						variant: 'destructive',
						title: 'Error',
						description:
							data.error ||
							'Failed to fetch Steam account status.',
					});
				}
			} catch (error) {
				toast({
					variant: 'destructive',
					title: 'Error',
					description: 'An unexpected error occurred.',
				});
				// ! #REMOVE
				console.error(error);
			}
		}

		updateSteamAccountStatus();
	}, []);

	return (
		<>
			<div
				className='flex flex-col px-32 py-20 m-1 items-center text-center w-full cursor-pointer transition-300 hover:bg-steamColor rounded-md'
				onClick={() => signIn('steam')}
			>
				{isSteamAccountLinked ? (
					<FaCheck className='w-40 h-40' />
				) : (
					<FaSteamSymbol className='w-40 h-40' />
				)}
				<DialogTitle className='text-2xl font-semibold'>
					Steam account linking
				</DialogTitle>
			</div>

			<DialogFooter className='flex mt-8 justify-around'>
				<Button
					onClick={previousStep}
					variant='secondary'
					className='sm:w-48'
				>
					Previous
				</Button>
				{isSteamAccountLinked ? (
					<Button onClick={nextStep} className='sm:w-48'>
						Continue
					</Button>
				) : (
					<Button
						onClick={nextStep}
						variant='default'
						className='sm:w-48'
					>
						Skip
					</Button>
				)}
			</DialogFooter>
		</>
	);
}
