import Link from 'next/link';
import { Github, Instagram, Mail } from 'lucide-react';
import { SteamIcon } from './Icons';

/**
 * Sticky-reveal footer (https://github.com/olivierlarose/sticky-footer): the outer wrapper is a
 * normal-flow element that reserves the footer's height at the true bottom of the page, and its
 * clip-path confines the inner footer — pinned with `fixed bottom-0` — to that reserved box, so
 * it only becomes visible as the page scrolls into that space. Below `md` the footer flows
 * normally instead, since there's no room to spare for a fixed panel on small screens.
 */
export default function Footer() {
	return (
		<div className='relative h-auto md:h-44' style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}>
			<footer className='flex h-auto w-full flex-col items-center justify-center border-t bg-background p-5 text-center text-sm text-foreground md:fixed md:bottom-0 md:h-44'>
				<div className='mb-5 flex flex-row gap-8'>
					<Link href={'https://github.com/alt-plus-f4/tournler/'} aria-label='Tournler on GitHub'>
						<Github aria-hidden className='h-7 w-7 transition-colors hover:text-blue-400' />
					</Link>
					<Link href={'https://www.instagram.com/valhalkata/'} aria-label='Instagram'>
						<Instagram aria-hidden className='h-7 w-7 transition-colors hover:text-yellow-300' />
					</Link>
					<Link href={'mailto:valentin@asenov.dev'} aria-label='Email'>
						<Mail aria-hidden className='h-7 w-7 transition-colors hover:text-red-400' />
					</Link>
					<Link href={'https://steamcommunity.com/id/passenov'} aria-label='Steam profile'>
						<SteamIcon aria-hidden className='h-7 w-7 transition-colors hover:text-steamLogoColor' />
					</Link>
				</div>
				<nav aria-label='Legal' className='mb-3 flex gap-4 text-muted-foreground'>
					<Link href='/terms' className='hover:text-foreground hover:underline underline-offset-4'>
						Terms of Service
					</Link>
					<Link href='/privacy' className='hover:text-foreground hover:underline underline-offset-4'>
						Privacy Policy
					</Link>
				</nav>
				<p>&copy; 2025 Tournler. No rights reserved.</p>
			</footer>
		</div>
	);
}
