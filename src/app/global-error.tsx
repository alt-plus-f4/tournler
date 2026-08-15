'use client';

import { useEffect } from 'react';

// Regular error.tsx boundaries can't catch errors thrown by the root layout
// itself (providers, Navbar, the session lookup in layout.tsx) - only
// global-error.tsx can, and it has to render its own <html>/<body> since it
// replaces the root layout entirely when triggered.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html lang='en'>
			<body className='antialiased dark bg-background text-foreground min-h-screen flex items-center justify-center px-6'>
				<div className='mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center'>
					<h2 className='text-2xl font-semibold'>Something went wrong</h2>
					<p className='text-sm text-muted-foreground'>Try reloading the page. If the issue keeps happening, let us know.</p>
					<button onClick={reset} className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
