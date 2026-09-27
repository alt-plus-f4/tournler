'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Game } from '@prisma/client';
import { GAME_FILTER_COOKIE, GAME_META, gameParam, parseGameParam } from '@/lib/games';
import { GameGlyph } from '@/components/games/GameMark';
import { cn } from '@/lib/utils';

const ONE_YEAR = 60 * 60 * 24 * 365;
// The three hub tabs (see HubSubnav) — switching games from one of these keeps you on the same
// tab (e.g. Teams·CS2 → Teams·LoL) instead of always landing back on Tournaments.
const HUB_TAB_PATHS = ['/tournaments', '/matches', '/teams'];
// Fired whenever a click here changes which game a hub page shows. Same pathname, new `?game=` —
// usePathname alone can't see that, so every other HubNavLink instance listens for this instead.
const GAME_CHANGE_EVENT = 'tournler:hub-game-change';

/** Same "?game= wins, else the cookie, else CS2" rule the hub pages resolve server-side. */
function readActiveGame(): Game {
	const fromUrl = parseGameParam(new URLSearchParams(window.location.search).get('game'));
	if (fromUrl) return fromUrl;
	const fromCookie = parseGameParam(document.cookie.match(new RegExp(`(?:^|; )${GAME_FILTER_COOKIE}=([^;]+)`))?.[1]);
	return fromCookie ?? 'CS2';
}

/**
 * A top-nav entry into a game hub (direction B). Writes GAME_FILTER_COOKIE on click so the hub
 * (Tournaments/Matches/Teams) keeps opening on this game on later visits that don't carry `?game=`
 * — the same cookie those pages already read server-side. Plain — the hub accent hue lives on the
 * hub page itself (HubPageGlow), not on this nav entry.
 */
export function HubNavLink({ game, href, className, onNavigate }: { game: Game; href: string; className?: string; onNavigate?: () => void }) {
	const pathname = usePathname();
	const currentTabPath = HUB_TAB_PATHS.find((p) => pathname === p || pathname.startsWith(`${p}/`));
	const target = currentTabPath ? `${currentTabPath}?game=${gameParam(game)}` : href;

	// Client-only "you are here": read post-mount only (never during SSR), so it can't cause a
	// hydration mismatch — worst case this entry's highlight paints one tick after hydration.
	const [activeGame, setActiveGame] = useState<Game | null>(null);
	useEffect(() => {
		if (!currentTabPath) {
			setActiveGame(null);
			return;
		}
		const handler = () => setActiveGame(readActiveGame());
		handler();
		window.addEventListener(GAME_CHANGE_EVENT, handler);
		window.addEventListener('popstate', handler);
		return () => {
			window.removeEventListener(GAME_CHANGE_EVENT, handler);
			window.removeEventListener('popstate', handler);
		};
	}, [pathname, currentTabPath]);

	const isActive = !!currentTabPath && activeGame === game;

	return (
		<Link
			href={target}
			onClick={() => {
				try {
					document.cookie = `${GAME_FILTER_COOKIE}=${gameParam(game)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
				} catch {
					// Cookies blocked: the ?game= in the href still opens the right hub this once.
				}
				window.dispatchEvent(new Event(GAME_CHANGE_EVENT));
				onNavigate?.();
			}}
			aria-current={isActive ? 'page' : undefined}
			className={cn(className, isActive && 'bg-white/10 text-white')}
		>
			<GameGlyph game={game} className='h-[15px] w-[15px]' />
			{game === 'CS2' ? GAME_META.CS2.short : GAME_META.LOL.label}
		</Link>
	);
}
