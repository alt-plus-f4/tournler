'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NAV_LINKS } from '@/lib/nav-links';
import { cn } from '@/lib/utils';

interface BurgerMenuProps {
	className?: string;
}

// Built on the Radix Dialog-backed Sheet so it gets focus trapping, Escape-to-close, focus
// return to the trigger, and is fully removed from the tab order while closed.
export const BurgerMenu: React.FC<BurgerMenuProps> = ({ className }) => {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<button type='button' className={cn('-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} aria-label='Open menu'>
					<Menu className='h-6 w-6' aria-hidden />
				</button>
			</SheetTrigger>
			<SheetContent side='left' className='w-72 bg-black p-0'>
				<SheetTitle className='px-6 pb-4 pt-6 text-xs font-bold uppercase tracking-widest text-neutral-400'>Menu</SheetTitle>
				<nav aria-label='Main'>
					<ul className='border-t border-border'>
						{NAV_LINKS.map(({ href, label }) => {
							const isActive = pathname === href || pathname.startsWith(`${href}/`);
							return (
								<li key={href} className='border-b border-border'>
									<Link
										href={href}
										onClick={() => setIsOpen(false)}
										aria-current={isActive ? 'page' : undefined}
										className={cn('flex h-14 items-center px-6 text-base font-medium transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none', isActive ? 'text-white' : 'text-neutral-300')}
									>
										{label}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</SheetContent>
		</Sheet>
	);
};
