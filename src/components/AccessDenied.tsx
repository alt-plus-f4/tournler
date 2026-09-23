import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FaLock } from 'react-icons/fa';

interface AccessDeniedProps {
	resource: string;
}

export function AccessDenied({ resource }: AccessDeniedProps) {
	return (
		<div className='mx-4 mt-12 flex max-w-6xl flex-col items-center py-24 text-center md:mx-12'>
			<FaLock aria-hidden className='mb-4 text-4xl text-muted-foreground' />
			<h1 className='mb-2 text-2xl font-bold'>Access denied</h1>
			<p className='text-muted-foreground mb-6'>Your role doesn&apos;t have permission to manage {resource}.</p>
			<Link href='/admin' className={cn(buttonVariants({ variant: 'outline' }))}>
				Back to dashboard
			</Link>
		</div>
	);
}
