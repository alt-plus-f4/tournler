'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useClientSession } from '@/lib/hooks/use-client-session';
import { isAdminRole } from '@/lib/helpers/permission-map';
import LoginButtons from '@/components/LoginButtons';
import { SuspendedSignOut } from '@/components/SuspensionNotice';

// Signed-in only: the account menu (dropdown/popper, avatar, SWR) stays out of anonymous pages.
const UserNav = dynamic(() => import('@/components/UserNav').then((m) => m.UserNav), {
	ssr: false,
	loading: () => <span aria-hidden className='block h-8 w-8 rounded-full border border-border bg-muted' />,
});

// Convex (the only consumer is the notification bell) loads only for signed-in users.
const Notifications = dynamic(() => import('./NotificationsIsland'), {
	ssr: false,
	loading: () => <span aria-hidden className='block h-10 w-10' />,
});

/** Right side of the navbar: sign-in buttons, or the signed-in account controls. */
export function NavAccount() {
	const { session, ban, status } = useClientSession();

	// Fixed-size placeholder so nothing shifts when the session arrives.
	if (status === 'loading') return <span aria-hidden className='block h-9 w-[168px]' />;
	if (ban) return <SuspendedSignOut />;
	if (!session?.user) return <LoginButtons className='flex flex-row sm:inline' />;

	return (
		<div className='flex flex-row items-center justify-center space-x-4'>
			{isAdminRole(session.user.role) && (
				<Link
					href='/admin'
					aria-label='Admin'
					className='flex min-h-8 min-w-8 items-center justify-center gap-2 rounded-md bg-red-600 px-2 py-1 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
				>
					<Wrench aria-hidden className='h-4 w-4' />
					<span aria-hidden className='hidden text-xs font-bold uppercase tracking-widest md:block'>
						Admin
					</span>
				</Link>
			)}
			<Notifications userId={session.user.id} />
			<UserNav />
		</div>
	);
}
