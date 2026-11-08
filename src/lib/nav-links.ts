import type { Game } from '@prisma/client';

/**
 * The two front doors: CS2 and LoL are each a hub. A game link opens that hub's Overview page
 * (`href`); from one of the hub's list tabs (see HubSubnav) it keeps you on that tab instead.
 */
export const HUB_LINKS: { game: Game; href: string }[] = [
	{ game: 'CS2', href: '/cs2' },
	{ game: 'LOL', href: '/lol' },
];

/** Each hub's Overview route, by game. */
export const HUB_HOME: Record<Game, string> = { CS2: '/cs2', LOL: '/lol' };

// Single source for the rest of the primary navigation, shared by the desktop header and the
// mobile BurgerMenu so the two can't drift apart (they previously differed in language and items).
export const NAV_LINKS = [
	{ href: '/news', label: 'News' },
	{ href: '/forum', label: 'Forum' },
] as const;
