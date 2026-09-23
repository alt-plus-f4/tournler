import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import SignIn from '@/components/SignIn';
import { ChevronLeft } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
	title: 'Sign in',
};

export default async function Page() {
	const session = await getAuthSession();
	if (session) redirect('/');

	return (
		<div className='flex min-h-[80vh] items-center justify-center px-4 py-12'>
			<div className='flex w-full max-w-md flex-col gap-10'>
				<Link href='/' className={cn(buttonVariants({ variant: 'ghost' }), 'self-start')}>
					<ChevronLeft aria-hidden className='mr-2 h-4 w-4' />
					Home
				</Link>

				<SignIn />
			</div>
		</div>
	);
}
