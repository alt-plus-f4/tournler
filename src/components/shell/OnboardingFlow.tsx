'use client';

import Providers from '@/app/redux/Providers';
import { OnboardingDialog } from '@/components/Onboarding';

/** Lazily loaded: the Redux store is only used by the onboarding wizard. */
export default function OnboardingFlow() {
	return (
		<Providers>
			<OnboardingDialog isOpen />
		</Providers>
	);
}
