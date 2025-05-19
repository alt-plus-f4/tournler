import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function MainNav({
	className,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	return (
		<div className={cn('items-center', className)} {...props}>
			<div className='mx-auto flex justify-center space-x-4 xl:space-x-0 xl:justify-between w-full h-full'>
				<Link
					href='/information'
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						'text-xs px-3 lg:text-sm lg:px-12 border-x navbar-color hover:navbar-color'
					)}
				>
					Information
				</Link>
				<Link
					href='/tournaments'
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						'text-xs px-3 lg:text-sm lg:px-12 border-x navbar-color hover:navbar-color'
					)}
				>
					Tournaments
				</Link>
				<Link
					href='/teams'
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						'text-xs px-3 lg:text-sm lg:px-12 border-x navbar-color hover:navbar-color'
					)}
				>
					Teams
				</Link>
			</div>
		</div>
	);
}
