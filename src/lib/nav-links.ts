// Single source for the primary navigation, shared by the desktop MainNav and the mobile
// BurgerMenu so the two can't drift apart (they previously differed in language and items).
export const NAV_LINKS = [
	{ href: '/information', label: 'Information' },
	{ href: '/tournaments', label: 'Tournaments' },
	{ href: '/matches', label: 'Matches' },
	{ href: '/teams', label: 'Teams' },
] as const;
