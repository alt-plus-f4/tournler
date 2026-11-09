'use client';

import { useEffect, useRef } from 'react';
import { useClientSession } from '@/lib/hooks/use-client-session';
import { applyThemeInBrowser, readThemeCookie } from '@/lib/theme';

/**
 * Keeps this device's theme cookie in step with the signed-in player's saved theme (e.g. picked on
 * another device). The root layout's inline script already applied the cookie before first paint;
 * this only corrects it after sign-in or a change elsewhere. On sign-out the player's cookie is
 * cleared, so the next person on this device gets the site default rather than their theme.
 */
export function ThemeSync() {
	const { session } = useClientSession();
	const theme = session?.user?.theme;
	const hadSession = useRef(false);

	useEffect(() => {
		if (!session) {
			if (hadSession.current) applyThemeInBrowser(null);
			hadSession.current = false;
			return;
		}
		hadSession.current = true;
		if (theme === undefined) return;
		if (readThemeCookie(document.cookie) !== theme) applyThemeInBrowser(theme);
	}, [session, theme]);

	return null;
}
