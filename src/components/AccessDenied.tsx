import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FaLock } from 'react-icons/fa';

interface AccessDeniedProps {
	resource: string;
}

export function AccessDenied({ resource }: AccessDeniedProps) {
	return (
		<div className='mx-12 mt-12 w-[80%] flex flex-col items-center text-center py-24'>
			<FaLock className='text-4xl text-red-500 mb-4' />
			<h1 className='text-2xl font-bold mb-2'>Access Denied</h1>
			<p className='text-muted-foreground mb-6'>Your role doesn&apos;t have permission to manage {resource}.</p>
			<Link href='/admin' className={cn(buttonVariants({ variant: 'outline' }))}>
				Back to Dashboard
			</Link>
		</div>
	);
}
