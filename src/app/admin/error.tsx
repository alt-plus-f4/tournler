'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className='mx-auto mt-20 flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center'>
			<h2 className='text-2xl font-semibold'>Admin panel failed to load</h2>
			<p className='text-sm text-muted-foreground'>Try reloading the page. If the issue keeps happening, the admin data fetch needs attention.</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
