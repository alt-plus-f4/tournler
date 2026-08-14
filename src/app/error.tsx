'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className='min-h-[60vh] flex items-center justify-center px-6'>
			<div className='mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center'>
				<h2 className='text-2xl font-semibold'>Something went wrong</h2>
				<p className='text-sm text-muted-foreground'>Try reloading the page. If the issue keeps happening, let us know.</p>
				<Button onClick={reset}>Try again</Button>
			</div>
		</div>
	);
}
