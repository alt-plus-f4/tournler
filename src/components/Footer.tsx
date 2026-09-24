import Link from 'next/link';
import { Github, Instagram, Mail } from 'lucide-react';
import { SteamIcon } from './Icons';

const Footer = () => {
	return (
		<footer className='footer-parallax relative isolate mt-auto w-full overflow-hidden border-t text-center text-sm text-foreground'>
			{/* Back layer: the broadcast end card. Moves slower than the page (see .footer-parallax in globals.css). */}
			<div aria-hidden className='fp-back pointer-events-none absolute inset-x-0 bottom-0 -z-10 flex select-none justify-center'>
				<span className='whitespace-nowrap font-black uppercase leading-[0.8] tracking-tight text-transparent [-webkit-text-stroke:1px_#262626] text-[clamp(3.5rem,14vw,6rem)]'>Tournler</span>
			</div>
			{/* Front layer: the actual footer content. */}
			<div className='fp-front flex flex-col items-center justify-center px-5 pb-16 pt-8'>
			<div className='mb-5 flex flex-row gap-8'>
				<Link href={'https://github.com/alt-plus-f4/tournler/'} aria-label='Tournler on GitHub'>
					<Github aria-hidden className='w-7 h-7 hover:text-blue-400 transition-colors' />
				</Link>
				<Link href={'https://www.instagram.com/valhalkata/'} aria-label='Instagram'>
					<Instagram aria-hidden className='w-7 h-7 hover:text-yellow-300 transition-colors' />
				</Link>
                <Link href={'mailto:valentin@asenov.dev'} aria-label='Email'>
                    <Mail aria-hidden className='w-7 h-7 hover:text-red-400 transition-colors' />
                </Link>
				<Link href={'https://steamcommunity.com/id/passenov'} aria-label='Steam profile'>
					<SteamIcon aria-hidden className='w-7 h-7 hover:text-steamLogoColor transition-colors' />
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
			</div>
		</footer>
	);
};

export default Footer;
