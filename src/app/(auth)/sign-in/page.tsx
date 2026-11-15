import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import SignIn from '@/components/SignIn';
import { loadSignInStats } from '@/lib/sign-in-stats';

export const metadata: Metadata = {
	title: 'Sign in',
};

// Signed-in visitors are redirected away in src/proxy.ts. The counts come from a tagged data-cache
// entry and no request data is read, so this page still renders statically.
export default async function Page() {
	const stats = await loadSignInStats();
	return (
		<div className='relative'>
			<Link
				href='/'
				className='absolute left-4 top-4 z-10 inline-flex items-center rounded-md px-2 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:left-auto lg:right-6'
			>
				<ChevronLeft aria-hidden className='mr-1 h-4 w-4' />
				Home
			</Link>
			<SignIn stats={stats} />
		</div>
	);
}
