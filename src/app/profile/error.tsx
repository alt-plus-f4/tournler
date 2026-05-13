'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className='min-h-screen bg-black px-6 py-12'>
			<div className='mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center'>
				<h2 className='text-2xl font-semibold text-white'>Profile failed to load</h2>
				<p className='text-sm text-gray-300'>Try reloading the page. If this keeps failing, the profile API may be returning invalid data.</p>
				<Button onClick={reset}>Try again</Button>
			</div>
		</div>
	);
}
