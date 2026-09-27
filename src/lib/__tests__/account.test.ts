/**
 * @jest-environment node
 *
 * deleteUserAccount decides what happens to data other people rely on (a captained team, organised
 * tournaments, news posts), so each branch is pinned here against a mocked Prisma client.
 */
const findUnique = jest.fn();
const teamUpdate = jest.fn();
const teamDelete = jest.fn();
const userDelete = jest.fn();
const deleteBlobsQuietly = jest.fn();
const deleteUserNotifications = jest.fn();

jest.mock('@/lib/db', () => ({
	db: {
		user: { findUnique: (...args: unknown[]) => findUnique(...args) },
		$transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ cs2Team: { update: teamUpdate, delete: teamDelete }, user: { delete: userDelete } }),
	},
}));
jest.mock('@/lib/blob', () => ({ deleteBlobsQuietly: (...args: unknown[]) => deleteBlobsQuietly(...args) }));
jest.mock('@/lib/convex-server', () => ({ deleteUserNotifications: (...args: unknown[]) => deleteUserNotifications(...args) }));

import { AccountDeletionBlockedError, deleteUserAccount } from '@/lib/account';

const AVATAR = 'https://x.public.blob.vercel-storage.com/avatars/u1-abc.svg';
const LOGO = 'https://x.public.blob.vercel-storage.com/logos/team-7.png';

function user(overrides: Record<string, unknown> = {}) {
	return { id: 'u1', image: AVATAR, _count: { organizedTournaments: 0, newsPosts: 0 }, captainOf: [], ...overrides };
}

function team(overrides: Record<string, unknown> = {}) {
	return { id: 7, logo: LOGO, cs2TournamentId: null, members: [], _count: { matchesAsTeamA: 0, matchesAsTeamB: 0 }, ...overrides };
}

beforeEach(() => {
	jest.clearAllMocks();
	deleteUserNotifications.mockResolvedValue(0);
});

test('returns false for an unknown user without deleting anything', async () => {
	findUnique.mockResolvedValue(null);
	await expect(deleteUserAccount('nope')).resolves.toBe(false);
	expect(userDelete).not.toHaveBeenCalled();
});

test('deletes a plain account, its avatar and its notifications', async () => {
	findUnique.mockResolvedValue(user());
	await expect(deleteUserAccount('u1')).resolves.toBe(true);
	expect(userDelete).toHaveBeenCalledWith({ where: { id: 'u1' } });
	expect(deleteBlobsQuietly).toHaveBeenCalledWith([AVATAR]);
	expect(deleteUserNotifications).toHaveBeenCalledWith('u1');
});

test('blocks organisers and news authors', async () => {
	findUnique.mockResolvedValue(user({ _count: { organizedTournaments: 2, newsPosts: 0 } }));
	await expect(deleteUserAccount('u1')).rejects.toBeInstanceOf(AccountDeletionBlockedError);
	findUnique.mockResolvedValue(user({ _count: { organizedTournaments: 0, newsPosts: 1 } }));
	await expect(deleteUserAccount('u1')).rejects.toBeInstanceOf(AccountDeletionBlockedError);
	expect(userDelete).not.toHaveBeenCalled();
});

test('hands captaincy to the longest-standing remaining member', async () => {
	findUnique.mockResolvedValue(user({ captainOf: [team({ members: [{ id: 'u2' }] })] }));
	await deleteUserAccount('u1');
	expect(teamUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { capitanId: 'u2' } });
	expect(teamDelete).not.toHaveBeenCalled();
	expect(deleteBlobsQuietly).toHaveBeenCalledWith([AVATAR]);
});

test('deletes a solo team with no history, including its logo', async () => {
	findUnique.mockResolvedValue(user({ captainOf: [team()] }));
	await deleteUserAccount('u1');
	expect(teamDelete).toHaveBeenCalledWith({ where: { id: 7 } });
	expect(deleteBlobsQuietly).toHaveBeenCalledWith([AVATAR, LOGO]);
});

test('keeps a solo team that has played, without a captain', async () => {
	findUnique.mockResolvedValue(user({ captainOf: [team({ _count: { matchesAsTeamA: 3, matchesAsTeamB: 0 } })] }));
	await deleteUserAccount('u1');
	expect(teamDelete).not.toHaveBeenCalled();
	expect(teamUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { capitanId: null } });
	expect(userDelete).toHaveBeenCalled();
});

test('a Convex failure does not undo or fail the deletion', async () => {
	findUnique.mockResolvedValue(user());
	deleteUserNotifications.mockRejectedValue(new Error('convex down'));
	const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
	await expect(deleteUserAccount('u1')).resolves.toBe(true);
	spy.mockRestore();
});
