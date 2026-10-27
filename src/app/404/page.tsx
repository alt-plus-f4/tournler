import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
	title: 'Page not found',
};

export default function Error404() {
	return (
		<div className='relative flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-16 text-center'>
			<div aria-hidden className='pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0,hsl(0_0%_100%/0.08),transparent)]' />
			<div className='relative'>
				<p
					aria-hidden
					className='bg-gradient-to-b from-white/15 to-white/[0.03] bg-clip-text font-mono text-[clamp(110px,22vw,230px)] font-black leading-[0.85] tabular-nums tracking-wide text-transparent'
				>
					404
				</p>
				<h1 className='mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Page not found</h1>
				<p className='mt-3 text-sm text-muted-foreground'>
					<span className='sr-only'>Error 404. </span>This page doesn&apos;t exist, or the link is wrong.
				</p>
				<div className='mt-6 flex flex-wrap justify-center gap-2'>
					<Link href='/' className={buttonVariants()}>
						Home
					</Link>
					<Link href='/tournaments' className={buttonVariants({ variant: 'outline' })}>
						Tournaments
					</Link>
				</div>
			</div>
		</div>
	);
}
