import type { Game } from '@prisma/client';

/** Client-safe game metadata. Direction C: one feed, every row carries its game. */
export const GAMES = ['CS2', 'LOL'] as const satisfies readonly Game[];

export const GAME_META: Record<Game, { label: string; short: string; account: string; accountAction: string }> = {
	CS2: { label: 'Counter-Strike 2', short: 'CS2', account: 'Steam', accountAction: 'Link Steam' },
	LOL: { label: 'League of Legends', short: 'LoL', account: 'Riot ID', accountAction: 'Link Riot ID' },
};

/** `?game=cs2|lol` → Game, anything else → null (= all games). */
export function parseGameParam(value: string | null | undefined): Game | null {
	const v = value?.toLowerCase();
	return v === 'cs2' ? 'CS2' : v === 'lol' ? 'LOL' : null;
}

export function gameParam(game: Game): 'cs2' | 'lol' {
	return game === 'CS2' ? 'cs2' : 'lol';
}

/** Remembered feed filter (A's best idea on top of C): cookie so server pages can read it too. */
export const GAME_FILTER_COOKIE = 'tournler-game';
