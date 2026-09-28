import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import SignIn from '@/components/SignIn';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Sign in',
};

// Signed-in visitors are redirected away in src/proxy.ts, so this page renders statically.
export default function Page() {
	return (
		<div className='flex min-h-[80vh] items-center justify-center px-4 py-12'>
			<div className='stage-grid flex w-full max-w-md flex-col rounded-lg border border-border px-6 py-10 sm:px-10'>
				<Link href='/' className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-8 -ml-2 self-start text-neutral-400 hover:text-white')}>
					<ChevronLeft aria-hidden className='mr-1 h-4 w-4' />
					Home
				</Link>

				<SignIn />
			</div>
		</div>
	);
}
