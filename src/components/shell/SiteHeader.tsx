'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Game } from '@prisma/client';
import { BurgerMenu } from '@/components/BurgerMenu';
import { GameGlyph } from '@/components/games/GameMark';
import { GAME_META } from '@/lib/games';
import { HUB_LINKS, NAV_LINKS } from '@/lib/nav-links';
import { cn } from '@/lib/utils';
import { HubNavLink } from './HubNavLink';
import { NavAccount } from './NavAccount';
import { NavLink } from './NavLink';
import { SiteSearch } from './SiteSearch';

export type HeaderData = {
	games: Record<Game, { teams: number; openTournaments: number }>;
} | null;

/** Scroll distance (px) after which the desktop bar hands over to the floating pill. */
const PILL_AFTER = 120;
const DESKTOP_QUERY = '(min-width: 1280px)';

// Static strings so Tailwind sees every class. Active = tinted underline + a faint same-hue wash.
const TAB_TINT: Record<Game, string> = {
	CS2: 'aria-[current=page]:border-b-[#FDE68A] aria-[current=page]:bg-[linear-gradient(0deg,rgba(253,230,138,0.1),transparent)]',
	LOL: 'aria-[current=page]:border-b-[#93C5FD] aria-[current=page]:bg-[linear-gradient(0deg,rgba(147,197,253,0.1),transparent)]',
};
// In the pill the active game is a tinted chip with a hairline ring (an underline reads badly on a rounded tab).
const PILL_TINT: Record<Game, string> = {
	CS2: 'aria-[current=page]:bg-[rgba(253,230,138,0.12)] aria-[current=page]:ring-1 aria-[current=page]:ring-inset aria-[current=page]:ring-[rgba(253,230,138,0.35)]',
	LOL: 'aria-[current=page]:bg-[rgba(147,197,253,0.12)] aria-[current=page]:ring-1 aria-[current=page]:ring-inset aria-[current=page]:ring-[rgba(147,197,253,0.35)]',
};

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const PILL_ITEM = cn(
	'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white aria-[current=page]:text-white',
	FOCUS,
);
const PILL_DOTS = { backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '4px 4px' };

function statusLine(stats: { teams: number; openTournaments: number }) {
	const teams = `${stats.teams} ${stats.teams === 1 ? 'team' : 'teams'}`;
	if (stats.openTournaments === 0) return teams;
	return `${teams} · ${stats.openTournaments} open ${stats.openTournaments === 1 ? 'tournament' : 'tournaments'}`;
}

/** True on desktop once the page has scrolled past PILL_AFTER. */
function usePillMode() {
	const [pill, setPill] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia(DESKTOP_QUERY);
		let frame = 0;
		const update = () => {
			frame = 0;
			setPill(mq.matches && window.scrollY > PILL_AFTER);
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		mq.addEventListener('change', update);
		return () => {
			window.removeEventListener('scroll', onScroll);
			mq.removeEventListener('change', update);
			if (frame) cancelAnimationFrame(frame);
		};
	}, []);
	return pill;
}

/**
 * Nav F. Desktop: a bar at the top of the page (game tabs with a status line, News/Forum,
 * search, account); once scrolled it gives way to a centered floating pill with the same links.
 * Below xl: one compact sticky bar with the burger menu, logo, search and account.
 * Only one account area is mounted at a time, so the notification bell never subscribes twice.
 */
export function SiteHeader({ data }: { data: HeaderData }) {
	const pill = usePillMode();

	return (
		<>
			<header className='navbar-color sticky top-0 z-50 w-full border-b xl:relative'>
				<div className='relative flex h-16 items-stretch px-4 xl:px-5'>
					<BurgerMenu className='self-center xl:hidden' />

					<Link
						href='/'
						aria-label='Tournler home'
						className={cn('absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-sm xl:static xl:mr-6 xl:translate-x-0 xl:translate-y-0', FOCUS)}
					>
						<Image src='/logo.png' alt='Tournler' width={210} height={32} priority className='h-auto w-[96px] transition-[filter] hover:brightness-150 sm:w-[140px]' />
					</Link>

					<nav aria-label='Main' className='hidden items-stretch xl:flex'>
						{HUB_LINKS.map(({ game, href }) => (
							<HubNavLink
								key={game}
								game={game}
								href={href}
								className={cn(
									'flex items-center gap-2.5 border-b-2 border-l border-b-transparent px-[22px] text-neutral-300 transition-colors hover:bg-white/5 hover:text-white aria-[current=page]:text-white',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
									TAB_TINT[game],
								)}
							>
								<GameGlyph game={game} className={cn('h-[18px] w-[18px]', game === 'LOL' && 'rounded')} />
								<span className='text-left'>
									<strong className='block text-[15px] font-black uppercase leading-tight tracking-[0.025em]'>{GAME_META[game].label}</strong>
									{data && <span className='block text-[11px] font-normal text-neutral-400'>{statusLine(data.games[game])}</span>}
								</span>
							</HubNavLink>
						))}
						{NAV_LINKS.map(({ href, label }, i) => (
							<NavLink
								key={href}
								href={href}
								className={cn(
									'flex items-center border-l px-[22px] text-sm font-medium text-neutral-200 transition-colors hover:bg-white/5 hover:text-white',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
									i === NAV_LINKS.length - 1 && 'border-r',
								)}
							>
								{label}
							</NavLink>
						))}
					</nav>

					<div className='ml-auto flex items-center gap-3'>
						<SiteSearch className='rounded-md xl:border xl:border-border' />
						{!pill && <NavAccount />}
					</div>
				</div>
			</header>

			{/* Desktop only. Stays mounted so it can fade out; `invisible` (a discrete transition that
			    flips at the end) takes it out of the tab order and accessibility tree while hidden. */}
			<div
				aria-hidden
				className={cn(
					'pointer-events-none fixed inset-x-0 top-0 z-40 hidden h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent xl:block',
					'transition-opacity duration-300 motion-reduce:transition-none',
					pill ? 'opacity-100' : 'opacity-0',
				)}
			/>
			<div className='pointer-events-none fixed inset-x-0 top-0 z-50 hidden justify-center pt-3 xl:flex'>
				<div
					className={cn(
						'flex h-14 items-center gap-1 rounded-full border border-white/10 bg-neutral-950/90 pl-5 pr-2 backdrop-blur-xl backdrop-saturate-150',
						'shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]',
						'transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
						pill ? 'pointer-events-auto visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-3 scale-[0.98] opacity-0',
					)}
					style={PILL_DOTS}
				>
					<Link href='/' aria-label='Tournler home' className={cn('mr-2 flex rounded-sm transition-[filter] hover:brightness-150', FOCUS)}>
						<Image src='/logo.png' alt='Tournler' width={210} height={32} className='h-auto w-[96px]' />
					</Link>
					<span aria-hidden className='mx-2 h-6 w-px bg-white/10' />
					<nav aria-label='Quick navigation' className='flex items-center gap-1'>
						{HUB_LINKS.map(({ game, href }) => (
							<HubNavLink key={game} game={game} href={href} className={cn(PILL_ITEM, PILL_TINT[game])}>
								<GameGlyph game={game} className={cn('h-4 w-4', game === 'LOL' && 'rounded')} />
								{game === 'CS2' ? 'CS2' : 'League'}
							</HubNavLink>
						))}
						<span aria-hidden className='mx-1.5 h-6 w-px bg-white/10' />
						{NAV_LINKS.map(({ href, label }) => (
							<NavLink key={href} href={href} className={cn(PILL_ITEM, 'aria-[current=page]:bg-white/10')}>
								{label}
							</NavLink>
						))}
					</nav>
					<span aria-hidden className='mx-1.5 h-6 w-px bg-white/10' />
					<SiteSearch className='rounded-full hover:bg-white/[0.06]' />
					{pill && <NavAccount compact />}
				</div>
			</div>
		</>
	);
}
