'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { HUB_LINKS, NAV_LINKS } from '@/lib/nav-links';
import { HubNavLink } from '@/components/shell/HubNavLink';
import { cn } from '@/lib/utils';

interface BurgerMenuPanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The burger button lives outside this lazily loaded module, so focus is handed back to it on close. */
	triggerRef: RefObject<HTMLButtonElement | null>;
}

// Built on the Radix Dialog-backed Sheet so it gets focus trapping, Escape-to-close, focus
// return to the trigger, and is fully removed from the tab order while closed.
export default function BurgerMenuPanel({ open, onOpenChange, triggerRef }: BurgerMenuPanelProps) {
	const pathname = usePathname();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				id='burger-menu'
				side='left'
				className='w-72 bg-black p-0'
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<SheetTitle className='px-6 pb-4 pt-6 text-xs font-bold uppercase tracking-widest text-neutral-400'>Menu</SheetTitle>
				<nav aria-label='Main'>
					<ul className='border-t border-border'>
						{HUB_LINKS.map(({ game, href }) => (
							<li key={game} className='border-b border-border'>
								<HubNavLink
									game={game}
									href={href}
									onNavigate={() => onOpenChange(false)}
									className='flex h-14 items-center gap-3 px-6 text-base font-medium text-neutral-300 transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none'
								/>
							</li>
						))}
						{NAV_LINKS.map(({ href, label }) => {
							const isActive = pathname === href || pathname.startsWith(`${href}/`);
							return (
								<li key={href} className='border-b border-border'>
									<Link
										href={href}
										onClick={() => onOpenChange(false)}
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
}
