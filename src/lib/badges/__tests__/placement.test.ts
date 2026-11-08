import { avatarAward, avatarCandidates, awardsFor, badgeStatus, isBadgeId, parsePlacementPatch, visibleAwards } from '@/lib/badges/placement';

const badge = (id: number, flags: Partial<{ showInTrophyRow: boolean; showOnAvatar: boolean; showNextToName: boolean }> = {}) => ({
	id,
	showInTrophyRow: false,
	showOnAvatar: false,
	showNextToName: false,
	...flags,
});

// Newest first, as the profile query orders them.
const awards = [
	{ hidden: false, badge: badge(1, { showOnAvatar: true, showNextToName: true }) }, // Verified
	{ hidden: true, badge: badge(2, { showInTrophyRow: true, showOnAvatar: true }) }, // hidden by the player
	{ hidden: false, badge: badge(3, { showInTrophyRow: true }) },
	{ hidden: false, badge: badge(4, { showOnAvatar: true }) },
	{ hidden: false, badge: badge(5) }, // hidden everywhere by the admin
];

const ids = (list: { badge: { id: number } }[]) => list.map((a) => a.badge.id);

describe('badgeStatus', () => {
	it('is hidden only when every placement is off', () => {
		expect(badgeStatus(badge(1))).toBe('hidden');
		expect(badgeStatus(badge(1, { showNextToName: true }))).toBe('shown');
	});
});

describe('visibleAwards', () => {
	it('drops player-hidden awards only while player choice is on', () => {
		expect(ids(visibleAwards(awards, { playerChoice: true }))).toEqual([1, 3, 4, 5]);
		expect(ids(visibleAwards(awards, { playerChoice: false }))).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('awardsFor', () => {
	it('filters by placement and player choice, keeping order', () => {
		expect(ids(awardsFor(awards, 'showInTrophyRow', { playerChoice: true }))).toEqual([3]);
		expect(ids(awardsFor(awards, 'showInTrophyRow', { playerChoice: false }))).toEqual([2, 3]);
		expect(ids(awardsFor(awards, 'showNextToName', { playerChoice: true }))).toEqual([1]);
	});

	it('never shows a badge with every placement off', () => {
		for (const p of ['showInTrophyRow', 'showOnAvatar', 'showNextToName'] as const) {
			expect(ids(awardsFor(awards, p, { playerChoice: false }))).not.toContain(5);
		}
	});
});

describe('avatarAward', () => {
	it('defaults to the newest eligible award', () => {
		expect(avatarAward(awards, { playerChoice: true })?.badge.id).toBe(1);
		expect(ids(avatarCandidates(awards, { playerChoice: true }))).toEqual([1, 4]);
	});

	it('honours the player pick when allowed and still eligible', () => {
		expect(avatarAward(awards, { playerChoice: true, avatarBadgeId: 4 })?.badge.id).toBe(4);
	});

	it('ignores the pick when player choice is off, the badge is hidden, or not avatar-eligible', () => {
		expect(avatarAward(awards, { playerChoice: false, avatarBadgeId: 4 })?.badge.id).toBe(1);
		expect(avatarAward(awards, { playerChoice: true, avatarBadgeId: 2 })?.badge.id).toBe(1);
		expect(avatarAward(awards, { playerChoice: true, avatarBadgeId: 3 })?.badge.id).toBe(1);
	});

	it('is null with nothing eligible', () => {
		expect(avatarAward([{ hidden: false, badge: badge(9, { showInTrophyRow: true }) }], { playerChoice: true })).toBeNull();
	});
});

describe('parsePlacementPatch', () => {
	it('keeps known boolean flags only', () => {
		expect(parsePlacementPatch({ showOnAvatar: true, name: 'x' })).toEqual({ showOnAvatar: true });
		expect(parsePlacementPatch({})).toEqual({});
	});

	it('rejects non-booleans and non-objects', () => {
		expect(parsePlacementPatch({ showNextToName: 'yes' })).toEqual({ error: 'showNextToName must be a boolean' });
		expect(parsePlacementPatch(null)).toEqual({ error: 'Expected a JSON object' });
	});
});

describe('isBadgeId', () => {
	it('accepts positive INT4 ids only', () => {
		expect(isBadgeId(1)).toBe(true);
		expect(isBadgeId(2147483647)).toBe(true);
		expect(isBadgeId(2147483648)).toBe(false);
		expect(isBadgeId(0)).toBe(false);
		expect(isBadgeId(-3)).toBe(false);
		expect(isBadgeId(1.5)).toBe(false);
		expect(isBadgeId('4')).toBe(false);
	});
});
