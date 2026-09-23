'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

/**
 * Shell for the intercepted /sign-in and /sign-up routes. Uses the Radix Dialog so the modal
 * traps focus, closes on Escape/overlay click, and is announced as a dialog; closing it pops the
 * intercepted route off history, same as before.
 */
export function AuthModal({ title, children }: { title: string; children: React.ReactNode }) {
	const router = useRouter();

	useEffect(() => {
		try {
			if (!sessionStorage.getItem('preAuthPath')) {
				sessionStorage.setItem('preAuthPath', window.location.pathname || '/');
			}
		} catch {
			// sessionStorage may be unavailable (e.g. private browsing) — safe to ignore
		}
	}, []);

	return (
		<Dialog open onOpenChange={(open) => !open && router.back()}>
			<DialogContent className='max-w-md bg-black px-6 py-8'>
				<DialogTitle className='sr-only'>{title}</DialogTitle>
				{children}
			</DialogContent>
		</Dialog>
	);
}
