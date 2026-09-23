'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div role='alert' className='mx-4 mt-20 flex max-w-xl flex-col items-center gap-4 rounded-md border border-signal-live/20 bg-signal-live/10 p-8 text-center sm:mx-auto'>
			<h1 className='text-2xl font-semibold'>Teams failed to load</h1>
			<p className='text-sm text-muted-foreground'>Something went wrong on our side while loading this page. Try again, or reload in a minute.</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
