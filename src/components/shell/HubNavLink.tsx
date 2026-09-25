'use client';

import Link from 'next/link';
import type { Game } from '@prisma/client';
import { GAME_FILTER_COOKIE, GAME_META, gameParam } from '@/lib/games';
import { GameGlyph } from '@/components/games/GameMark';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * A top-nav entry into a game hub (direction B). Writes GAME_FILTER_COOKIE on click so the hub
 * (Tournaments/Matches/Teams) keeps opening on this game on later visits that don't carry `?game=`
 * — the same cookie those pages already read server-side. Plain — the hub accent hue lives on the
 * hub page itself (HubPageGlow), not on this nav entry.
 */
export function HubNavLink({ game, href, className, onNavigate }: { game: Game; href: string; className?: string; onNavigate?: () => void }) {
	return (
		<Link
			href={href}
			onClick={() => {
				try {
					document.cookie = `${GAME_FILTER_COOKIE}=${gameParam(game)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
				} catch {
					// Cookies blocked: the ?game= in the href still opens the right hub this once.
				}
				onNavigate?.();
			}}
			className={className}
		>
			<GameGlyph game={game} className='h-[15px] w-[15px]' />
			{game === 'CS2' ? GAME_META.CS2.short : GAME_META.LOL.label}
		</Link>
	);
}
