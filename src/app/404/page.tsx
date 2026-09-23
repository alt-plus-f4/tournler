import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
	title: 'Page not found',
};

export default function Error404() {
	return (
		<div className='flex min-h-[60vh] items-center justify-center px-4 py-12'>
			<div className='w-full max-w-xl rounded-md border border-border bg-card p-8 text-center'>
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-4xl'>Page not found</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					Error <span className='font-mono tabular-nums text-white'>404</span>. This page doesn&apos;t exist, or the link is wrong.
				</p>
				<div className='mt-6 flex flex-wrap justify-center gap-2'>
					<Link href='/' className={buttonVariants()}>
						Back to home
					</Link>
					<Link href='/tournaments' className={buttonVariants({ variant: 'outline' })}>
						Browse tournaments
					</Link>
				</div>
			</div>
		</div>
	);
}
