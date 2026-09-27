import { accountRegionalFor, isRiotPlatform, platformLabel, regionalFor, RIOT_PLATFORM_IDS } from '../regions';

describe('regions', () => {
	it('routes NA/BR/LAN/LAS to americas', () => {
		for (const p of ['na1', 'br1', 'la1', 'la2'] as const) expect(regionalFor(p)).toBe('americas');
	});

	it('routes EUW/EUNE/TR/RU/ME to europe', () => {
		for (const p of ['euw1', 'eun1', 'tr1', 'ru', 'me1'] as const) expect(regionalFor(p)).toBe('europe');
	});

	it('routes KR/JP to asia', () => {
		for (const p of ['kr', 'jp1'] as const) expect(regionalFor(p)).toBe('asia');
	});

	it('routes OCE/PH/SG/TH/TW/VN to sea', () => {
		for (const p of ['oc1', 'ph2', 'sg2', 'th2', 'tw2', 'vn2'] as const) expect(regionalFor(p)).toBe('sea');
	});

	it('account-v1 only serves americas/europe/asia, so sea platforms use asia', () => {
		expect(accountRegionalFor('oc1')).toBe('asia');
		expect(accountRegionalFor('sg2')).toBe('asia');
	});

	it('account-v1 regional matches the platform cluster for non-sea platforms', () => {
		expect(accountRegionalFor('na1')).toBe('americas');
		expect(accountRegionalFor('euw1')).toBe('europe');
		expect(accountRegionalFor('kr')).toBe('asia');
	});

	it('isRiotPlatform accepts every listed platform and rejects junk', () => {
		for (const p of RIOT_PLATFORM_IDS) expect(isRiotPlatform(p)).toBe(true);
		expect(isRiotPlatform('mars1')).toBe(false);
		expect(isRiotPlatform('')).toBe(false);
	});

	it('platformLabel shows the short label and falls back to uppercasing an unknown value', () => {
		expect(platformLabel('euw1')).toBe('EUW');
		expect(platformLabel('na1')).toBe('NA');
		expect(platformLabel('mars1')).toBe('MARS1');
	});
});
