import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { NAV_LINKS } from '@/lib/nav-links';

export function MainNav({
	className,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	return (
		<nav aria-label='Main' className={cn('items-center', className)} {...props}>
			<div className='mx-auto flex justify-center space-x-4 xl:space-x-0 xl:justify-between w-full h-full'>
				{NAV_LINKS.map(({ href, label }) => (
					<Link key={href} href={href} className={cn(buttonVariants({ variant: 'ghost' }), 'text-xs px-3 lg:text-sm lg:px-12 border-x')}>
						{label}
					</Link>
				))}
			</div>
		</nav>
	);
}
