'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { LinkPendingBar } from './LinkPending';
import { usePathname } from 'next/navigation';
import type { Game } from '@prisma/client';
import { GAME_FILTER_COOKIE, GAME_META, gameParam, parseGameParam } from '@/lib/games';
import { HUB_HOME } from '@/lib/nav-links';
import { GameGlyph } from '@/components/games/GameMark';
import { cn } from '@/lib/utils';

const ONE_YEAR = 60 * 60 * 24 * 365;
// The three hub list tabs (see HubSubnav) — switching games from one of these keeps you on the same
// tab (e.g. Teams·CS2 → Teams·LoL) instead of landing back on the hub's Overview.
const HUB_TAB_PATHS = ['/tournaments', '/matches', '/teams'];
// Fired whenever a click here changes which game a hub page shows. Same pathname, new `?game=` —
// usePathname alone can't see that, so every other HubNavLink instance listens for this instead.
// Carries the clicked game as `detail`: at dispatch time (synchronously inside onClick) the Link's
// navigation hasn't committed yet, so window.location.search still reflects the *previous* page —
// reading it here instead of trusting the detail made the first click show stale state and only
// the next click (once the prior navigation had settled) show the correct one.
const GAME_CHANGE_EVENT = 'tournler:hub-game-change';

/** Same "?game= wins, else the cookie, else CS2" rule the hub pages resolve server-side. */
function readActiveGame(): Game {
	const fromUrl = parseGameParam(new URLSearchParams(window.location.search).get('game'));
	if (fromUrl) return fromUrl;
	const fromCookie = parseGameParam(document.cookie.match(new RegExp(`(?:^|; )${GAME_FILTER_COOKIE}=([^;]+)`))?.[1]);
	return fromCookie ?? 'CS2';
}

/** The game whose Overview page `pathname` is, if any. */
function hubHomeGame(pathname: string): Game | null {
	return (Object.keys(HUB_HOME) as Game[]).find((g) => pathname === HUB_HOME[g] || pathname.startsWith(`${HUB_HOME[g]}/`)) ?? null;
}

/**
 * A nav entry into a game hub. Opens the hub's Overview (`href`), or — when you're on one of the hub
 * list tabs — the same tab for this game. Writes GAME_FILTER_COOKIE on click so the hub list pages
 * keep opening on this game on later visits that don't carry `?game=`. Sets aria-current when this
 * game's hub is the page you're on; callers style that with `aria-[current=page]:` variants.
 * `children` replaces the default glyph + name content.
 */
export function HubNavLink({
	game,
	href,
	className,
	style,
	onNavigate,
	children,
}: {
	game: Game;
	href: string;
	className?: string;
	style?: CSSProperties;
	onNavigate?: () => void;
	children?: ReactNode;
}) {
	const pathname = usePathname();
	const currentTabPath = HUB_TAB_PATHS.find((p) => pathname === p || pathname.startsWith(`${p}/`));
	const homeGame = hubHomeGame(pathname);
	// Only the list roots carry the game in the URL; a detail page (/teams/12) just switches to the list.
	const target = currentTabPath ? `${currentTabPath}?game=${gameParam(game)}` : href;

	// Client-only "you are here" for the list tabs: read post-mount only (never during SSR), so it
	// can't cause a hydration mismatch — worst case the highlight paints one tick after hydration.
	const [activeGame, setActiveGame] = useState<Game | null>(null);
	useEffect(() => {
		if (!currentTabPath) {
			setActiveGame(null);
			return;
		}
		// GAME_CHANGE_EVENT carries the just-clicked game directly (see its definition above) so this
		// updates in the same tick as the click, before the URL itself has changed. Other triggers
		// (mount, back/forward) have no such detail, so they fall back to reading the settled URL/cookie.
		const handler = (event?: Event) => {
			const detail = event instanceof CustomEvent ? (event.detail as Game | undefined) : undefined;
			setActiveGame(detail ?? readActiveGame());
		};
		handler();
		window.addEventListener(GAME_CHANGE_EVENT, handler);
		window.addEventListener('popstate', handler);
		return () => {
			window.removeEventListener(GAME_CHANGE_EVENT, handler);
			window.removeEventListener('popstate', handler);
		};
	}, [pathname, currentTabPath]);

	const isActive = homeGame === game || (!!currentTabPath && activeGame === game);

	return (
		<Link
			href={target}
			onClick={() => {
				try {
					document.cookie = `${GAME_FILTER_COOKIE}=${gameParam(game)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
				} catch {
					// Cookies blocked: the ?game= in the href still opens the right hub this once.
				}
				window.dispatchEvent(new CustomEvent(GAME_CHANGE_EVENT, { detail: game }));
				onNavigate?.();
			}}
			aria-current={isActive ? 'page' : undefined}
			className={cn('relative', className)}
			style={style}
		>
			{children ?? (
				<>
					<GameGlyph game={game} className='h-[15px] w-[15px]' />
					{game === 'CS2' ? GAME_META.CS2.short : GAME_META.LOL.label}
				</>
			)}
			<LinkPendingBar />
		</Link>
	);
}
