/**
 * @jest-environment node
 *
 * Bans are enforced centrally: getAuthSession() hides a banned user's session from every route.
 * These tests pin that, plus who is allowed to ban whom.
 */
const getServerSession = jest.fn();
// Next's App Router bundles a React with `cache`; the standalone React 18 Jest uses doesn't export it.
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: <T,>(fn: T) => fn }));
jest.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }));
jest.mock('next-auth/providers/email', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('next-auth/providers/discord', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
jest.mock('@/lib/db', () => ({ db: {} }));

import { getAuthSession, getSessionIncludingBanned } from '@/lib/auth';
import { activeBanWhere, banBlockedReason } from '@/lib/bans';

const signedIn = { user: { id: 'u1', role: 'USER', ban: null } };
const banned = { user: { id: 'u1', role: 'USER', ban: { id: 1, reason: 'spam', expiresAt: null, createdAt: '2026-09-24T00:00:00.000Z' } } };

describe('getAuthSession', () => {
	it('returns the session for a user in good standing', async () => {
		getServerSession.mockResolvedValueOnce(signedIn);
		await expect(getAuthSession()).resolves.toBe(signedIn);
	});

	it('treats a banned user as signed out', async () => {
		getServerSession.mockResolvedValueOnce(banned);
		await expect(getAuthSession()).resolves.toBeNull();
	});

	it('still exposes the banned session to the shell that explains the suspension', async () => {
		getServerSession.mockResolvedValueOnce(banned);
		await expect(getSessionIncludingBanned()).resolves.toBe(banned);
	});
});

describe('banBlockedReason', () => {
	const admin = { id: 'a', role: 'ADMIN' as const };
	const mod = { id: 'm', role: 'MODERATOR' as const };
	const player = { id: 'p', role: 'USER' as const };

	it('lets moderators ban regular players', () => expect(banBlockedReason(mod, player)).toBeNull());
	it('lets admins ban staff', () => expect(banBlockedReason(admin, mod)).toBeNull());
	it('stops moderators banning other staff', () => expect(banBlockedReason(mod, { id: 'm2', role: 'CONTENT_ADMIN' })).toMatch(/admin/i));
	it('never bans an admin', () => expect(banBlockedReason(admin, { id: 'a2', role: 'ADMIN' })).toMatch(/admins/i));
	it('never bans yourself', () => expect(banBlockedReason(mod, mod)).toMatch(/yourself/i));
});

describe('activeBanWhere', () => {
	it('matches unlifted bans that are permanent or not yet expired', () => {
		const now = new Date('2026-09-24T12:00:00Z');
		expect(activeBanWhere(now)).toEqual({ liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
	});
});
