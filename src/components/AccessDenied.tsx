import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AccessDeniedProps {
	resource: string;
}

export function AccessDenied({ resource }: AccessDeniedProps) {
	return (
		<div className='relative flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-16 text-center'>
			<div aria-hidden className='pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0,hsl(0_0%_100%/0.08),transparent)]' />
			<div className='relative flex max-w-md flex-col items-center'>
				<span className='mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-card'>
					<Lock aria-hidden className='h-6 w-6 text-muted-foreground' />
				</span>
				<p className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Access denied</p>
				<h1 className='mt-2 text-3xl font-black uppercase tracking-wide md:text-4xl'>You need staff access</h1>
				<p className='mt-3 text-sm text-muted-foreground'>Your role doesn&apos;t have permission to manage {resource}.</p>
				<Link href='/admin' className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}>
					Back to dashboard
				</Link>
			</div>
		</div>
	);
}
