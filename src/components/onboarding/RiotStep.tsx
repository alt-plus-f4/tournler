'use client';

import { useEffect, useState } from 'react';
import { RiotIdLinker } from '@/components/profile/RiotIdLinker';
import type { RiotStatusResponse } from '@/lib/riot/types';
import { StepHeading, StepFooter } from './StepChrome';

interface RiotStepProps {
	previousStep: () => void;
	nextStep: () => void;
}

const EMPTY: RiotStatusResponse = { configured: true, account: null };

/** Onboarding Riot ID step: the same link + ownership-verify flow as the profile's Game accounts panel. */
export function RiotStep({ previousStep, nextStep }: RiotStepProps) {
	const [riot, setRiot] = useState<RiotStatusResponse>(EMPTY);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetch('/api/user/riot')
			.then((res) => (res.ok ? res.json() : EMPTY))
			.then((data: RiotStatusResponse) => {
				if (!cancelled) setRiot(data);
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoaded(true);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const linked = riot.account?.status === 'linked';

	return (
		<div className='flex flex-1 flex-col px-6 py-10 sm:px-12'>
			<StepHeading title='Link your Riot ID' description="Needed to register for League of Legends tournaments. We never ask for your Riot password." />

			<div className='rounded-md border border-border bg-black/40 p-4'>{loaded && <RiotIdLinker value={riot} onChange={setRiot} />}</div>

			<StepFooter onPrevious={previousStep} onNext={nextStep} nextLabel={linked ? 'Continue' : 'Skip for now'} />
		</div>
	);
}
