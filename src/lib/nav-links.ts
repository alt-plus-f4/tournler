import type { Game } from '@prisma/client';

/**
 * Direction B's two front doors: CS2 and LoL are each a hub (tournaments, matches, teams — the hub
 * subnav, see HubSubnav) instead of top-level nav items. Landing on a hub opens it on Tournaments.
 */
export const HUB_LINKS: { game: Game; href: string }[] = [
	{ game: 'CS2', href: '/tournaments?game=cs2' },
	{ game: 'LOL', href: '/tournaments?game=lol' },
];

// Single source for the rest of the primary navigation, shared by the desktop MainNav and the
// mobile BurgerMenu so the two can't drift apart (they previously differed in language and items).
export const NAV_LINKS = [
	{ href: '/news', label: 'News' },
	{ href: '/forum', label: 'Forum' },
] as const;
