import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { DEFAULT_THEME, themeIdFromEnum, type ThemeId } from '@/lib/theme';

export const SITE_SETTINGS_ID = 1;

export interface SiteSettingsView {
	defaultTheme: ThemeId;
	/** Players may hide their own badges and choose which one sits on their avatar. */
	playerBadgeChoice: boolean;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettingsView = { defaultTheme: DEFAULT_THEME, playerBadgeChoice: true };

const loadSiteSettings = cachedQuery(
	async (): Promise<SiteSettingsView> => {
		const row = await db.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
		return row ? { defaultTheme: themeIdFromEnum(row.defaultTheme) ?? DEFAULT_THEME, playerBadgeChoice: row.playerBadgeChoice } : SITE_SETTINGS_DEFAULTS;
	},
	['site-settings'],
	{ tags: ['site'], revalidate: REVALIDATE.slow },
);

/**
 * The site settings singleton (data cache, flushed by any SiteSettings write). Never throws: the
 * root layout reads it on every page, so a database hiccup (or a build without one) falls back to defaults.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsView> => {
	try {
		return await loadSiteSettings();
	} catch (error) {
		console.error('Error loading site settings:', error);
		return SITE_SETTINGS_DEFAULTS;
	}
});
