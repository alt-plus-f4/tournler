import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import SignUp from '@/components/SignUp';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Sign up',
};

// Signed-in visitors are redirected away in src/proxy.ts, so this page renders statically.
export default function Page() {
	return (
		<div className='flex min-h-[80vh] items-center justify-center px-4 py-12'>
			<div className='flex w-full max-w-md flex-col gap-10'>
				<Link href='/' className={cn(buttonVariants({ variant: 'ghost' }), 'self-start')}>
					<ChevronLeft aria-hidden className='mr-2 h-4 w-4' />
					Home
				</Link>

				<SignUp />
			</div>
		</div>
	);
}
