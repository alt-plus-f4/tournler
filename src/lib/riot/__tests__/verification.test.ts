import { BASE_ICON_MAX, BASE_ICON_MIN, checkChallengeOpen, evaluateVerification, pickChallengeIcon } from '../verification';

describe('pickChallengeIcon', () => {
	it('never returns an excluded icon', () => {
		for (let i = 0; i < 50; i++) {
			const icon = pickChallengeIcon([5, 12], () => i / 50);
			expect(icon).not.toBe(5);
			expect(icon).not.toBe(12);
			expect(icon).toBeGreaterThanOrEqual(BASE_ICON_MIN);
			expect(icon).toBeLessThanOrEqual(BASE_ICON_MAX);
		}
	});

	it('ignores null/undefined in the exclude list', () => {
		expect(() => pickChallengeIcon([null, undefined, 3], () => 0)).not.toThrow();
	});

	it('is deterministic for a given random()', () => {
		expect(pickChallengeIcon([], () => 0)).toBe(BASE_ICON_MIN);
	});
});

describe('checkChallengeOpen / evaluateVerification', () => {
	const now = new Date('2026-09-24T12:00:00.000Z');

	it('reports no_challenge when nothing was ever linked', () => {
		expect(checkChallengeOpen({ verificationIconId: null, verificationExpiresAt: null, verifiedAt: null }, now)).toEqual({ result: 'no_challenge' });
	});

	it('reports already_verified for a settled, verified account', () => {
		expect(checkChallengeOpen({ verificationIconId: null, verificationExpiresAt: null, verifiedAt: now }, now)).toEqual({ result: 'already_verified' });
	});

	it('reports expired once the deadline has passed', () => {
		const expired = new Date(now.getTime() - 1000);
		expect(checkChallengeOpen({ verificationIconId: 7, verificationExpiresAt: expired, verifiedAt: null }, now)).toEqual({ result: 'expired' });
	});

	it('treats the exact expiry instant as expired (closed interval)', () => {
		expect(checkChallengeOpen({ verificationIconId: 7, verificationExpiresAt: now, verifiedAt: null }, now)).toEqual({ result: 'expired' });
	});

	it('is open just before expiry', () => {
		const soon = new Date(now.getTime() + 1000);
		expect(checkChallengeOpen({ verificationIconId: 7, verificationExpiresAt: soon, verifiedAt: null }, now)).toBeNull();
	});

	it('verifies a matching icon', () => {
		const soon = new Date(now.getTime() + 1000);
		expect(evaluateVerification({ verificationIconId: 7, verificationExpiresAt: soon, verifiedAt: null }, 7, now)).toEqual({ result: 'verified' });
	});

	it('reports a mismatch with both icon ids', () => {
		const soon = new Date(now.getTime() + 1000);
		expect(evaluateVerification({ verificationIconId: 7, verificationExpiresAt: soon, verifiedAt: null }, 9, now)).toEqual({ result: 'mismatch', expectedIconId: 7, currentIconId: 9 });
	});

	it('evaluateVerification still reports expired instead of checking the icon', () => {
		const expired = new Date(now.getTime() - 1);
		expect(evaluateVerification({ verificationIconId: 7, verificationExpiresAt: expired, verifiedAt: null }, 7, now)).toEqual({ result: 'expired' });
	});
});
