'use client';

import { useEffect, useState } from 'react';
import { RiotIdLinker } from '@/components/profile/RiotIdLinker';
import type { RiotStatusResponse } from '@/lib/riot/types';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';

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
		<div className='w-full max-w-md'>
			<h2 className='text-center text-2xl font-semibold'>Link your Riot ID</h2>
			<p className='mt-1 text-center text-sm text-muted-foreground'>Needed to register for League of Legends tournaments. We never ask for your Riot password.</p>

			<div className='mt-6 rounded-md border border-border p-4'>{loaded && <RiotIdLinker value={riot} onChange={setRiot} />}</div>

			<DialogFooter className='mt-8 flex justify-around'>
				<Button onClick={previousStep} variant='secondary' className='sm:w-48'>
					Previous
				</Button>
				<Button onClick={nextStep} variant='outline' className='sm:w-48'>
					{linked ? 'Continue' : 'Skip for now'}
				</Button>
			</DialogFooter>
		</div>
	);
}
