'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className='mx-auto mt-20 flex max-w-xl flex-col items-center gap-4 rounded-md border border-signal-live/40 p-8 text-center'>
			<h2 className='text-2xl font-semibold'>Admin panel failed to load</h2>
			<p className='text-sm text-muted-foreground'>Try reloading the page. If the issue keeps happening, check the server logs for the failing admin request.</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
