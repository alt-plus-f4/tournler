'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { LinkPendingBar } from '@/components/shell/LinkPending';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
				className='w-72 border-border bg-card p-0 sm:max-w-[300px]'
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<SheetTitle className='px-6 pb-4 pt-6 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400'>Menu</SheetTitle>
				<nav aria-label='Main'>
					<ul className='border-t border-border'>
						{HUB_LINKS.map(({ game, href }) => (
							<li key={game} className='border-b border-border'>
								<HubNavLink
									game={game}
									href={href}
									onNavigate={() => onOpenChange(false)}
									className='flex h-[60px] items-center gap-3 px-6 text-[15px] font-extrabold uppercase tracking-[0.08em] text-neutral-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:outline-none aria-[current=page]:shadow-[inset_3px_0_0_0_#fafafa]'
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
										className={cn(
											'relative flex h-[60px] items-center justify-between px-6 text-[15px] font-extrabold uppercase tracking-[0.08em] transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:outline-none',
											isActive ? 'text-white shadow-[inset_3px_0_0_0_#fafafa]' : 'text-neutral-400',
										)}
									>
										{label}
										<ChevronRight aria-hidden className='h-4 w-4 text-neutral-500' />
										<LinkPendingBar className='inset-x-0' />
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
