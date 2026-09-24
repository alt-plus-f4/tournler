'use client';

import Link from 'next/link';
import type { Game } from '@prisma/client';
import { GameGlyph } from '@/components/games/GameMark';
import { GAME_FILTER_COOKIE, GAME_META, GAMES, gameParam } from '@/lib/games';
import { cn } from '@/lib/utils';

type FilterValue = 'all' | 'cs2' | 'lol';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remember the choice so the next visit without `?game=` (read server-side) opens on it. */
function rememberFilter(value: FilterValue) {
	try {
		document.cookie = `${GAME_FILTER_COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
	} catch {
		// Cookies blocked: the ?game= param still carries the filter for this visit.
	}
}

/**
 * All / CS2 / LoL filter as links (`?game=all|cs2|lol`), so the filter is in the URL, works without
 * JS and is shareable; clicking also writes GAME_FILTER_COOKIE. "All" is explicit (`?game=all`) so it
 * overrides a remembered game instead of falling back to the cookie.
 */
export function GameFilterChips({ basePath, active, label = 'Filter by game' }: { basePath: string; active: Game | null; label?: string }) {
	const options: { value: FilterValue; game: Game | null; text: string; title?: string }[] = [
		{ value: 'all', game: null, text: 'All' },
		...GAMES.map((g) => ({ value: gameParam(g), game: g, text: GAME_META[g].short, title: GAME_META[g].label })),
	];

	return (
		<nav aria-label={label} className='flex flex-wrap gap-2'>
			{options.map((o) => {
				const isActive = o.game === active;
				return (
					<Link
						key={o.value}
						href={`${basePath}?game=${o.value}`}
						scroll={false}
						onClick={() => rememberFilter(o.value)}
						aria-current={isActive ? 'page' : undefined}
						className={cn(
							'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
							isActive ? 'border-foreground bg-foreground text-background' : 'border-border text-neutral-300 hover:border-neutral-500 hover:text-white',
						)}
					>
						{o.game && <GameGlyph game={o.game} className='h-3.5 w-3.5' />}
						{o.text}
						{o.title && <span className='sr-only'> ({o.title})</span>}
					</Link>
				);
			})}
		</nav>
	);
}
