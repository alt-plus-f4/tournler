'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useClientSession } from '@/lib/hooks/use-client-session';
import { fetchOnboardingStatus } from '@/lib/apifuncs';

// The wizard (Redux store, avatar generator, forms) is ~200KB and only matters to the handful of
// signed-in users who haven't finished onboarding, so it is split out and loaded on demand.
const OnboardingFlow = dynamic(() => import('./OnboardingFlow'), { ssr: false });

export function OnboardingGate() {
	const { session, ban } = useClientSession();
	const [needsOnboarding, setNeedsOnboarding] = useState(false);
	const userId = session?.user?.id;

	useEffect(() => {
		if (!userId || ban) return;
		let cancelled = false;
		(async () => {
			try {
				const stored = sessionStorage.getItem('isOnboardingCompleted');
				const completed = stored !== null ? stored === 'true' : await fetchOnboardingStatus();
				sessionStorage.setItem('isOnboardingCompleted', String(completed));
				if (!cancelled) setNeedsOnboarding(!completed);
			} catch (error) {
				console.error('Error fetching onboarding status:', error);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [userId, ban]);

	return needsOnboarding ? <OnboardingFlow /> : null;
}
