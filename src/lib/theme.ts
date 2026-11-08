import type { SiteTheme } from '@prisma/client';

/**
 * Colour themes. The id is what goes on <html data-theme="..."> (see src/app/globals.css); the
 * Prisma `SiteTheme` enum stores the same names upper-cased. Pure and client-safe.
 */
export const THEME_IDS = ['mono', 'mocha', 'gruvbox', 'nord', 'rosepine'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = 'mono';

/** Cookie mirroring a signed-in player's own pick; absent = follow the site default. */
export const THEME_COOKIE = 'tournler-theme';

export interface ThemeOption {
	id: ThemeId;
	label: string;
	/** Preview swatch colours: page, surface, accent. */
	swatch: { bg: string; card: string; accent: string };
}

export const THEMES: ThemeOption[] = [
	{ id: 'mono', label: 'Mono', swatch: { bg: '#0A0A0A', card: '#262626', accent: '#FAFAFA' } },
	{ id: 'mocha', label: 'Catppuccin Mocha', swatch: { bg: '#1e1e2e', card: '#313244', accent: '#cba6f7' } },
	{ id: 'gruvbox', label: 'Gruvbox', swatch: { bg: '#1d2021', card: '#3c3836', accent: '#fabd2f' } },
	{ id: 'nord', label: 'Nord', swatch: { bg: '#2e3440', card: '#434c5e', accent: '#88c0d0' } },
	{ id: 'rosepine', label: 'Rosé Pine', swatch: { bg: '#191724', card: '#26233a', accent: '#ebbcba' } },
];

const IDS = new Set<string>(THEME_IDS);

/** A theme id from any input (id or enum value, any case), or null when it isn't one. */
export function parseThemeId(value: unknown): ThemeId | null {
	if (typeof value !== 'string') return null;
	const id = value.trim().toLowerCase();
	return IDS.has(id) ? (id as ThemeId) : null;
}

export function themeIdFromEnum(value: SiteTheme | null | undefined): ThemeId | null {
	return value ? parseThemeId(value) : null;
}

export function themeEnumFromId(id: ThemeId): SiteTheme {
	return id.toUpperCase() as SiteTheme;
}

/** The player's own pick wins, then the cookie (same pick, cached on this device), then the site default. */
export function resolveTheme({ userTheme, cookieTheme, siteDefault }: { userTheme?: unknown; cookieTheme?: unknown; siteDefault?: unknown }): ThemeId {
	return parseThemeId(userTheme) ?? parseThemeId(cookieTheme) ?? parseThemeId(siteDefault) ?? DEFAULT_THEME;
}

/** Reads the theme cookie out of a `document.cookie` string. */
export function readThemeCookie(cookieString: string): ThemeId | null {
	const match = cookieString.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
	return match ? parseThemeId(decodeURIComponent(match[1])) : null;
}

/**
 * Inline <head> script for the root layout: sets <html data-theme> before first paint from the
 * player's cookie, else the site default the server rendered as `data-site-theme`. data-theme is
 * deliberately not a React-managed attribute, so a re-render of the layout can't clobber it.
 */
export function themeInitScript(): string {
	const ids = JSON.stringify(THEME_IDS);
	return `(function(){var d=document.documentElement,t=null;try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);t=m&&decodeURIComponent(m[1])}catch(e){}if(!t||${ids}.indexOf(t)<0)t=d.getAttribute('data-site-theme');if(${ids}.indexOf(t)<0)t='${DEFAULT_THEME}';d.setAttribute('data-theme',t)})()`;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Applies a theme in the browser right away and remembers it (null = back to the site default). */
export function applyThemeInBrowser(theme: ThemeId | null) {
	const root = document.documentElement;
	const next = theme ?? parseThemeId(root.dataset.siteTheme) ?? DEFAULT_THEME;
	root.setAttribute('data-theme', next);
	document.cookie = theme ? `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; SameSite=Lax` : `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export const THEME_COOKIE_MAX_AGE = ONE_YEAR;
