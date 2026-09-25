import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { HUB_LINKS, NAV_LINKS } from '@/lib/nav-links';
import { HubNavLink } from '@/components/shell/HubNavLink';

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
	const linkClass = cn(buttonVariants({ variant: 'ghost' }), 'gap-2 text-sm px-5 2xl:px-8 border-x');
	return (
		<nav aria-label='Main' className={cn('items-center', className)} {...props}>
			<div className='mx-auto flex justify-center space-x-4 xl:space-x-4 xl:justify-center w-full h-full'>
				{HUB_LINKS.map(({ game, href }) => (
					<HubNavLink key={game} game={game} href={href} className={linkClass} />
				))}
				{NAV_LINKS.map(({ href, label }) => (
					<Link key={href} href={href} className={cn(buttonVariants({ variant: 'ghost' }), 'text-sm px-5 2xl:px-8 border-x')}>
						{label}
					</Link>
				))}
			</div>
		</nav>
	);
}
