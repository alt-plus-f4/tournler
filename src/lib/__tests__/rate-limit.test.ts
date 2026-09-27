/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
	it('allows requests under the limit and blocks once it is reached', () => {
		const key = `test-${Math.random()}`;
		expect(checkRateLimit(key, 2, 60_000)).toBe(true);
		expect(checkRateLimit(key, 2, 60_000)).toBe(true);
		expect(checkRateLimit(key, 2, 60_000)).toBe(false);
	});

	it('tracks separate keys independently', () => {
		const keyA = `a-${Math.random()}`;
		const keyB = `b-${Math.random()}`;
		expect(checkRateLimit(keyA, 1, 60_000)).toBe(true);
		expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
		expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
	});

	it('resets once the window has elapsed', () => {
		const key = `reset-${Math.random()}`;
		const nowSpy = jest.spyOn(Date, 'now');

		nowSpy.mockReturnValue(1_000);
		expect(checkRateLimit(key, 1, 1_000)).toBe(true);
		expect(checkRateLimit(key, 1, 1_000)).toBe(false);

		nowSpy.mockReturnValue(2_001);
		expect(checkRateLimit(key, 1, 1_000)).toBe(true);

		nowSpy.mockRestore();
	});
});
