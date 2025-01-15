'use client';

import { useEffect, useState } from 'react';
import { OnboardingDialog } from './Onboarding';
import { fetchOnboardingStatus } from '@/lib/apifuncs';

export function OnboardingStatus() {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<
		boolean | null
	>(null);

	useEffect(() => {
		async function checkOnboardingStatus() {
			try {
				const storedStatus = sessionStorage.getItem(
					'isOnboardingCompleted'
				);
				if (storedStatus !== null) {
					setIsOnboardingCompleted(storedStatus === 'true');
					return;
				}

				const status = await fetchOnboardingStatus();
				setIsOnboardingCompleted(status);

				sessionStorage.setItem('isOnboardingCompleted', String(status));
			} catch (error) {
				console.error('Error fetching onboarding status:', error);
			}
		}

		checkOnboardingStatus();
	}, []);

	return (
		<>
			{isOnboardingCompleted === false && (
				<OnboardingDialog isOpen={!isOnboardingCompleted} />
			)}
		</>
	);
}
