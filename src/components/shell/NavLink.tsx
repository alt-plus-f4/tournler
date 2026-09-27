'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A primary-nav link (News/Forum) that highlights itself while its route is active — desktop
 * counterpart to the inline isActive check BurgerMenuPanel already does for the mobile menu, and
 * the plain-page sibling of HubNavLink (which handles the game-hub entries, active on a different
 * signal — the current hub game — since their href is always one of the same three hub routes).
 */
export function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
	const pathname = usePathname();
	const isActive = pathname === href || pathname.startsWith(`${href}/`);

	return (
		<Link href={href} aria-current={isActive ? 'page' : undefined} className={cn(className, isActive && 'bg-white/10 text-white')}>
			{children}
		</Link>
	);
}
