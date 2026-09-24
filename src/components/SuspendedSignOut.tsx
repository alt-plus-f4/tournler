'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Replaces the account menu for suspended users so they can still sign out. */
export function SuspendedSignOut() {
	return (
		<Button variant='outline' size='sm' onClick={() => signOut({ callbackUrl: '/' })}>
			<LogOut aria-hidden />
			Sign out
		</Button>
	);
}
