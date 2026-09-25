import type { Game } from '@prisma/client';

/** Client-safe game metadata. */
export const GAMES = ['CS2', 'LOL'] as const satisfies readonly Game[];

export const GAME_META: Record<Game, { label: string; short: string; account: string; accountAction: string }> = {
	CS2: { label: 'Counter-Strike 2', short: 'CS2', account: 'Steam', accountAction: 'Link Steam' },
	LOL: { label: 'League of Legends', short: 'LoL', account: 'Riot ID', accountAction: 'Link Riot ID' },
};

/**
 * Hub accent hue — direction B's one deliberate exception to the On-Air Rule (see DESIGN.md):
 * a very subtle warm yellow wash for the CS2 hub, a very subtle blue wash for the LoL hub. Lives on
 * the hub page itself (HubPageGlow — a soft, fixed radial wash behind the content), not on the nav:
 * the CS2/LoL nav entries and the hub subnav bar stay plain white/monochrome. Never used to report
 * state, and never leaking outside the hub pages (profile, home, news, forum stay untouched).
 */
export const GAME_ACCENT: Record<Game, { hex: string }> = {
	CS2: { hex: '#fde68a' },
	LOL: { hex: '#93c5fd' },
};

/**
 * Each game's real mark (GameGlyph, GameTag): white-on-transparent icons in /public, everywhere a
 * game is labeled — the CS2 soldier icon, Ahri for LoL. Unlike GAME_ACCENT, not confined to the hub
 * chrome.
 */
export const GAME_ICON_SRC: Record<Game, string> = {
	CS2: '/cs2.png',
	LOL: '/ahri.png',
};

/** `?game=cs2|lol` → Game, anything else → null (= all games). */
export function parseGameParam(value: string | null | undefined): Game | null {
	const v = value?.toLowerCase();
	return v === 'cs2' ? 'CS2' : v === 'lol' ? 'LOL' : null;
}

export function gameParam(game: Game): 'cs2' | 'lol' {
	return game === 'CS2' ? 'cs2' : 'lol';
}

/** Remembered hub: cookie so server pages can read it too, without a `?game=` on every link. */
export const GAME_FILTER_COOKIE = 'tournler-game';
