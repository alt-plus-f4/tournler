import { RIOT_ATTEMPT_LIMIT, RIOT_ATTEMPT_WINDOW_MS, __resetRiotAttempts, takeRiotAttempt } from '../rate-limit';

describe('takeRiotAttempt', () => {
	beforeEach(() => __resetRiotAttempts());

	it('allows attempts under the limit', () => {
		for (let i = 0; i < RIOT_ATTEMPT_LIMIT; i++) expect(takeRiotAttempt('u1', 1000 * i)).toBeNull();
	});

	it('blocks the attempt right after the limit, with seconds until the window frees up', () => {
		const now = 0;
		for (let i = 0; i < RIOT_ATTEMPT_LIMIT; i++) takeRiotAttempt('u1', now + i);
		const wait = takeRiotAttempt('u1', now + RIOT_ATTEMPT_LIMIT);
		expect(wait).not.toBeNull();
		expect(wait!).toBeGreaterThan(0);
		expect(wait!).toBeLessThanOrEqual(Math.ceil(RIOT_ATTEMPT_WINDOW_MS / 1000));
	});

	it('frees up once the oldest attempt ages out of the window', () => {
		const now = 0;
		for (let i = 0; i < RIOT_ATTEMPT_LIMIT; i++) takeRiotAttempt('u1', now + i);
		expect(takeRiotAttempt('u1', now + RIOT_ATTEMPT_WINDOW_MS + 1)).toBeNull();
	});

	it('tracks each user independently', () => {
		for (let i = 0; i < RIOT_ATTEMPT_LIMIT; i++) takeRiotAttempt('u1', i);
		expect(takeRiotAttempt('u2', 0)).toBeNull();
	});
});
