import { applyThemeInBrowser, parseThemeId, readThemeCookie, resolveTheme, themeEnumFromId, themeIdFromEnum, themeInitScript, THEME_COOKIE, THEMES, THEME_IDS } from '@/lib/theme';

function clearCookie() {
	document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
}

describe('theme ids', () => {
	it('parses ids and enum values in any case, rejects the rest', () => {
		expect(parseThemeId('mocha')).toBe('mocha');
		expect(parseThemeId('ROSEPINE')).toBe('rosepine');
		expect(parseThemeId(' Nord ')).toBe('nord');
		expect(parseThemeId('solarized')).toBeNull();
		expect(parseThemeId(undefined)).toBeNull();
		expect(parseThemeId(3)).toBeNull();
	});

	it('round-trips through the Prisma enum', () => {
		for (const id of THEME_IDS) expect(themeIdFromEnum(themeEnumFromId(id))).toBe(id);
		expect(themeIdFromEnum(null)).toBeNull();
	});

	it('has a picker option for every id, Mono first', () => {
		expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS]);
		expect(THEMES[0].id).toBe('mono');
	});
});

describe('resolveTheme', () => {
	it('prefers the player, then the cookie, then the site default, then mono', () => {
		expect(resolveTheme({ userTheme: 'nord', cookieTheme: 'mocha', siteDefault: 'gruvbox' })).toBe('nord');
		expect(resolveTheme({ userTheme: null, cookieTheme: 'mocha', siteDefault: 'gruvbox' })).toBe('mocha');
		expect(resolveTheme({ cookieTheme: 'bogus', siteDefault: 'GRUVBOX' })).toBe('gruvbox');
		expect(resolveTheme({})).toBe('mono');
	});
});

describe('readThemeCookie', () => {
	it('finds the theme cookie among others', () => {
		expect(readThemeCookie(`a=1; ${THEME_COOKIE}=rosepine; b=2`)).toBe('rosepine');
		expect(readThemeCookie(`${THEME_COOKIE}=mocha`)).toBe('mocha');
		expect(readThemeCookie(`x${THEME_COOKIE}=mocha`)).toBeNull();
		expect(readThemeCookie(`${THEME_COOKIE}=evil`)).toBeNull();
		expect(readThemeCookie('')).toBeNull();
	});
});

describe('themeInitScript', () => {
	const run = () => new Function(themeInitScript())();
	const root = document.documentElement;

	beforeEach(() => {
		clearCookie();
		root.removeAttribute('data-theme');
		root.removeAttribute('data-site-theme');
	});

	it('uses the site default without a cookie', () => {
		root.setAttribute('data-site-theme', 'gruvbox');
		run();
		expect(root.getAttribute('data-theme')).toBe('gruvbox');
	});

	it('lets the cookie win, and ignores an unknown cookie value', () => {
		root.setAttribute('data-site-theme', 'gruvbox');
		document.cookie = `${THEME_COOKIE}=nord; path=/`;
		run();
		expect(root.getAttribute('data-theme')).toBe('nord');

		document.cookie = `${THEME_COOKIE}=hacker; path=/`;
		run();
		expect(root.getAttribute('data-theme')).toBe('gruvbox');
	});

	it('falls back to mono when nothing is set', () => {
		run();
		expect(root.getAttribute('data-theme')).toBe('mono');
	});
});

describe('applyThemeInBrowser', () => {
	beforeEach(clearCookie);

	it('sets the attribute and cookie, and clears back to the site default', () => {
		document.documentElement.setAttribute('data-site-theme', 'mocha');
		applyThemeInBrowser('nord');
		expect(document.documentElement.getAttribute('data-theme')).toBe('nord');
		expect(readThemeCookie(document.cookie)).toBe('nord');

		applyThemeInBrowser(null);
		expect(document.documentElement.getAttribute('data-theme')).toBe('mocha');
		expect(readThemeCookie(document.cookie)).toBeNull();
	});
});
