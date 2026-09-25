/**
 * @jest-environment node
 *
 * The link + verify flow against a mocked Prisma client and a mocked Riot API client: the parts
 * that matter for correctness (never trusting a client PUUID, refusing an already-claimed account,
 * the verify outcomes, rate limiting, and the "not configured" honesty rule).
 */
jest.mock('server-only', () => ({}));

const findUnique = jest.fn();
const upsert = jest.fn();
const update = jest.fn();
const deleteMany = jest.fn();

jest.mock('@/lib/db', () => ({
	db: { riotAccount: { findUnique: (...a: unknown[]) => findUnique(...a), upsert: (...a: unknown[]) => upsert(...a), update: (...a: unknown[]) => update(...a), deleteMany: (...a: unknown[]) => deleteMany(...a) } },
}));

const getAccountByRiotId = jest.fn();
const getSummonerByPuuid = jest.fn();
const getDataDragonVersion = jest.fn();
const riotApiConfigured = jest.fn();

jest.mock('../client', () => {
	const actual = jest.requireActual('../client');
	return {
		...actual,
		getAccountByRiotId: (...a: unknown[]) => getAccountByRiotId(...a),
		getSummonerByPuuid: (...a: unknown[]) => getSummonerByPuuid(...a),
		getDataDragonVersion: (...a: unknown[]) => getDataDragonVersion(...a),
		riotApiConfigured: () => riotApiConfigured(),
	};
});

import { RiotApiError } from '../client';
import { __resetRiotAttempts } from '../rate-limit';
import { getRiotStatus, linkRiotId, unlinkRiotId, verifyRiotId } from '../service';

const NOW = new Date('2026-09-24T12:00:00.000Z');

beforeEach(() => {
	jest.clearAllMocks();
	__resetRiotAttempts();
	riotApiConfigured.mockReturnValue(true);
	getDataDragonVersion.mockResolvedValue(null);
});

describe('getRiotStatus', () => {
	it('returns configured: false with no account when RIOT_API_KEY is unset', async () => {
		riotApiConfigured.mockReturnValue(false);
		findUnique.mockResolvedValue(null);
		await expect(getRiotStatus('u1')).resolves.toEqual({ configured: false, account: null });
	});

	it('returns null when nothing is linked', async () => {
		findUnique.mockResolvedValue(null);
		await expect(getRiotStatus('u1')).resolves.toEqual({ configured: true, account: null });
	});

	it('reports a linked account with no challenge', async () => {
		findUnique.mockResolvedValue({ gameName: 'valkyr', tagLine: 'EUW', region: 'euw1', verificationIconId: null, verificationExpiresAt: null, verifiedAt: NOW });
		await expect(getRiotStatus('u1')).resolves.toEqual({
			configured: true,
			account: { gameName: 'valkyr', tagLine: 'EUW', region: 'euw1', status: 'linked', challenge: null },
		});
	});

	it('reports a pending account with its open challenge, icon number only when Data Dragon is unavailable', async () => {
		findUnique.mockResolvedValue({ gameName: 'valkyr', tagLine: 'EUW', region: 'euw1', verificationIconId: 7, verificationExpiresAt: new Date(NOW.getTime() + 60_000), verifiedAt: null });
		const status = await getRiotStatus('u1');
		expect(status.account?.status).toBe('pending');
		expect(status.account?.challenge).toEqual({ iconId: 7, expiresAt: new Date(NOW.getTime() + 60_000).toISOString(), iconUrl: null });
	});
});

describe('linkRiotId', () => {
	const input = { gameName: 'valkyr', tagLine: 'EUW', region: 'euw1' as const };

	it('is honest about not being configured, without touching Riot or the db', async () => {
		riotApiConfigured.mockReturnValue(false);
		const result = await linkRiotId('u1', input, NOW);
		expect(result).toEqual({ ok: false, status: 503, error: expect.stringMatching(/set up/i) });
		expect(getAccountByRiotId).not.toHaveBeenCalled();
	});

	it('404s with a friendly message when Riot has no such Riot ID', async () => {
		getAccountByRiotId.mockRejectedValue(new RiotApiError('not_found', 'nope'));
		const result = await linkRiotId('u1', input, NOW);
		expect(result).toMatchObject({ ok: false, status: 404 });
	});

	it('refuses (409) a PUUID already linked to a different user, without ever trusting a client-supplied PUUID', async () => {
		getAccountByRiotId.mockResolvedValue({ puuid: 'p-1', gameName: 'valkyr', tagLine: 'EUW' });
		findUnique.mockImplementation(({ where }: { where: { puuid?: string; userId?: string } }) => (where.puuid ? { userId: 'someone-else' } : null));
		const result = await linkRiotId('u1', input, NOW);
		expect(result).toEqual({ ok: false, status: 409, error: expect.stringMatching(/already linked/i) });
		expect(getSummonerByPuuid).not.toHaveBeenCalled();
	});

	it('links a fresh account with a new icon challenge, excluding the current profile icon', async () => {
		getAccountByRiotId.mockResolvedValue({ puuid: 'p-1', gameName: 'valkyr', tagLine: 'EUW' });
		findUnique.mockResolvedValue(null); // no existing owner, no existing account for this user
		getSummonerByPuuid.mockResolvedValue({ puuid: 'p-1', profileIconId: 3 });
		upsert.mockImplementation(({ create }: { create: Record<string, unknown> }) => ({ ...create, verifiedAt: null }));

		const result = await linkRiotId('u1', input, NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('unreachable');
		expect(result.body.account?.status).toBe('pending');
		const created = upsert.mock.calls[0][0].create;
		expect(created.puuid).toBe('p-1');
		expect(created.verificationIconId).not.toBe(3);
		expect(created.verificationExpiresAt.getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
	});

	it('re-linking an already-verified account for the same PUUID (e.g. a region fix) stays verified', async () => {
		getAccountByRiotId.mockResolvedValue({ puuid: 'p-1', gameName: 'valkyr', tagLine: 'NA1' });
		findUnique.mockImplementation(({ where }: { where: { puuid?: string; userId?: string } }) =>
			where.puuid ? { userId: 'u1' } : { userId: 'u1', puuid: 'p-1', verifiedAt: NOW, verificationIconId: null, verificationExpiresAt: null },
		);
		getSummonerByPuuid.mockResolvedValue({ puuid: 'p-1', profileIconId: 5 });
		upsert.mockImplementation(({ update: u }: { update: Record<string, unknown> }) => ({ userId: 'u1', puuid: 'p-1', gameName: 'valkyr', tagLine: 'NA1', region: 'euw1', verifiedAt: NOW, ...u }));

		const result = await linkRiotId('u1', { ...input, tagLine: 'NA1' }, NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('unreachable');
		expect(result.body.account?.status).toBe('linked');
		expect(upsert.mock.calls[0][0].update.verificationIconId).toBeNull();
	});

	it('rate-limits after 10 attempts in 10 minutes for the same user', async () => {
		getAccountByRiotId.mockRejectedValue(new RiotApiError('not_found', 'nope'));
		for (let i = 0; i < 10; i++) await linkRiotId('u1', input, NOW);
		const result = await linkRiotId('u1', input, NOW);
		expect(result).toMatchObject({ ok: false, status: 429 });
	});
});

describe('verifyRiotId', () => {
	it('is honest about not being configured', async () => {
		riotApiConfigured.mockReturnValue(false);
		const result = await verifyRiotId('u1', NOW);
		expect(result).toEqual({ ok: false, status: 503, error: expect.stringMatching(/set up/i) });
	});

	it('404s when nothing is linked yet', async () => {
		findUnique.mockResolvedValue(null);
		const result = await verifyRiotId('u1', NOW);
		expect(result).toMatchObject({ ok: false, status: 404 });
	});

	it('410s once the 10-minute challenge has expired', async () => {
		findUnique.mockResolvedValue({ userId: 'u1', puuid: 'p-1', region: 'euw1', verificationIconId: 7, verificationExpiresAt: new Date(NOW.getTime() - 1), verifiedAt: null });
		const result = await verifyRiotId('u1', NOW);
		expect(result).toMatchObject({ ok: false, status: 410 });
		expect(getSummonerByPuuid).not.toHaveBeenCalled();
	});

	it('409s with the expected icon number on a mismatch', async () => {
		findUnique.mockResolvedValue({ userId: 'u1', puuid: 'p-1', region: 'euw1', verificationIconId: 7, verificationExpiresAt: new Date(NOW.getTime() + 60_000), verifiedAt: null });
		getSummonerByPuuid.mockResolvedValue({ puuid: 'p-1', profileIconId: 9 });
		const result = await verifyRiotId('u1', NOW);
		expect(result).toMatchObject({ ok: false, status: 409, error: expect.stringContaining('#7') });
	});

	it('verifies on a match and clears the challenge', async () => {
		findUnique.mockResolvedValue({ userId: 'u1', puuid: 'p-1', region: 'euw1', verificationIconId: 7, verificationExpiresAt: new Date(NOW.getTime() + 60_000), verifiedAt: null });
		getSummonerByPuuid.mockResolvedValue({ puuid: 'p-1', profileIconId: 7 });
		update.mockResolvedValue({ gameName: 'valkyr', tagLine: 'EUW', region: 'euw1', verificationIconId: null, verificationExpiresAt: null, verifiedAt: NOW });

		const result = await verifyRiotId('u1', NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('unreachable');
		expect(result.body.account?.status).toBe('linked');
		expect(update.mock.calls[0][0].data).toMatchObject({ verifiedAt: NOW, verificationIconId: null, verificationExpiresAt: null });
	});

	it('short-circuits to success for an already-verified account without calling Riot again', async () => {
		findUnique.mockResolvedValue({ userId: 'u1', puuid: 'p-1', region: 'euw1', verificationIconId: null, verificationExpiresAt: null, verifiedAt: NOW });
		const result = await verifyRiotId('u1', NOW);
		expect(result.ok).toBe(true);
		expect(getSummonerByPuuid).not.toHaveBeenCalled();
	});
});

describe('unlinkRiotId', () => {
	it('deletes the session user’s Riot account', async () => {
		await unlinkRiotId('u1');
		expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
	});
});
