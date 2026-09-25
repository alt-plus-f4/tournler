/**
 * @jest-environment node
 *
 * One team per game: create / accept must refuse a second team of the same game, allow one of the
 * other game, and run their checks inside the locked transaction (not against the outer client).
 */
const outer = { cs2Team: { findFirst: jest.fn(), findMany: jest.fn() } };
const tx = {
	$queryRaw: jest.fn(),
	cs2Team: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
	cs2TeamInvitation: { findFirst: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
};

jest.mock('@/lib/db', () => ({
	db: {
		cs2Team: { findFirst: (...a: unknown[]) => outer.cs2Team.findFirst(...a), findMany: (...a: unknown[]) => outer.cs2Team.findMany(...a) },
		$transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
	},
}));

import { acceptTeamInvite, assertCanJoin, createTeam, getUserTeams, isGame, MembershipError } from '@/lib/teams/membership';

const cs2Team = { id: 1, name: 'Alpha', game: 'CS2', logo: null, capitanId: 'u1' };
const lolTeam = { id: 2, name: 'Bravo', game: 'LOL', logo: null, capitanId: 'u9' };

beforeEach(() => {
	jest.clearAllMocks();
	tx.cs2Team.findFirst.mockResolvedValue(null);
	tx.cs2Team.create.mockImplementation(({ data }) => Promise.resolve({ id: 10, ...data }));
});

describe('isGame', () => {
	it('accepts only known games', () => {
		expect(isGame('CS2')).toBe(true);
		expect(isGame('LOL')).toBe(true);
		expect(isGame('cs2')).toBe(false);
		expect(isGame(undefined)).toBe(false);
	});
});

describe('getUserTeams', () => {
	it('keys teams by game and fills missing games with null', async () => {
		outer.cs2Team.findMany.mockResolvedValue([cs2Team]);
		await expect(getUserTeams('u1')).resolves.toEqual({ CS2: cs2Team, LOL: null });
	});

	it('returns both when the user plays both games', async () => {
		outer.cs2Team.findMany.mockResolvedValue([cs2Team, lolTeam]);
		await expect(getUserTeams('u1')).resolves.toEqual({ CS2: cs2Team, LOL: lolTeam });
	});
});

describe('assertCanJoin', () => {
	it('throws ALREADY_ON_TEAM when the user has a team of that game', async () => {
		outer.cs2Team.findFirst.mockResolvedValue(cs2Team);
		await expect(assertCanJoin('u1', 'CS2')).rejects.toMatchObject({ code: 'ALREADY_ON_TEAM', status: 409 });
	});

	it('looks the team up for that game only, as member or captain', async () => {
		outer.cs2Team.findFirst.mockResolvedValue(null);
		await expect(assertCanJoin('u1', 'LOL')).resolves.toBeUndefined();
		expect(outer.cs2Team.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { game: 'LOL', OR: [{ members: { some: { id: 'u1' } } }, { capitanId: 'u1' }] } }));
	});
});

describe('createTeam', () => {
	it('creates the team with the user as captain and member, under a user lock', async () => {
		const team = await createTeam('u1', 'Alpha', 'LOL');
		expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
		expect(tx.cs2Team.create).toHaveBeenCalledWith({ data: { name: 'Alpha', game: 'LOL', members: { connect: { id: 'u1' } }, capitan: { connect: { id: 'u1' } } } });
		expect(tx.cs2TeamInvitation.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', team: { game: 'LOL' } } });
		expect(team).toMatchObject({ id: 10, game: 'LOL' });
	});

	it('refuses a second team of the same game (checked inside the transaction)', async () => {
		tx.cs2Team.findFirst.mockResolvedValueOnce(cs2Team);
		await expect(createTeam('u1', 'Other', 'CS2')).rejects.toBeInstanceOf(MembershipError);
		expect(outer.cs2Team.findFirst).not.toHaveBeenCalled();
		expect(tx.cs2Team.create).not.toHaveBeenCalled();
	});

	it('refuses a name already used by a team of that game', async () => {
		tx.cs2Team.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 3 });
		await expect(createTeam('u1', 'alpha', 'CS2')).rejects.toMatchObject({ code: 'NAME_TAKEN', status: 409 });
		expect(tx.cs2Team.findFirst).toHaveBeenLastCalledWith({ where: { game: 'CS2', name: { equals: 'alpha', mode: 'insensitive' } }, select: { id: true } });
		expect(tx.cs2Team.create).not.toHaveBeenCalled();
	});
});

describe('acceptTeamInvite', () => {
	const invitedTeam = (members: number, game = 'LOL') => ({ id: 2, game, _count: { members } });

	it('404s when there is no invitation', async () => {
		tx.cs2TeamInvitation.findFirst.mockResolvedValue(null);
		await expect(acceptTeamInvite('u1', 2)).resolves.toEqual({ ok: false, status: 404, message: 'Invitation not found' });
		expect(tx.cs2Team.update).not.toHaveBeenCalled();
	});

	it('locks both the user and the team', async () => {
		tx.cs2TeamInvitation.findFirst.mockResolvedValue({ id: 5 });
		tx.cs2Team.findUnique.mockResolvedValue(invitedTeam(2));
		await acceptTeamInvite('u1', 2);
		expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
	});

	it('joins a team of a game the user has no team for and clears that game’s other invites', async () => {
		tx.cs2TeamInvitation.findFirst.mockResolvedValue({ id: 5 });
		tx.cs2Team.findUnique.mockResolvedValue(invitedTeam(2));
		await expect(acceptTeamInvite('u1', 2)).resolves.toEqual({ ok: true, game: 'LOL' });
		expect(tx.cs2Team.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { members: { connect: { id: 'u1' } } } });
		expect(tx.cs2TeamInvitation.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', team: { game: 'LOL' } } });
	});

	it('refuses when the user is already on a team of that game, keeping the invite', async () => {
		tx.cs2TeamInvitation.findFirst.mockResolvedValue({ id: 5 });
		tx.cs2Team.findUnique.mockResolvedValue(invitedTeam(2, 'CS2'));
		tx.cs2Team.findFirst.mockResolvedValue(cs2Team);
		await expect(acceptTeamInvite('u1', 2)).rejects.toMatchObject({ code: 'ALREADY_ON_TEAM' });
		expect(tx.cs2Team.update).not.toHaveBeenCalled();
		expect(tx.cs2TeamInvitation.delete).not.toHaveBeenCalled();
	});

	it('drops the invite when the team is full', async () => {
		tx.cs2TeamInvitation.findFirst.mockResolvedValue({ id: 5 });
		tx.cs2Team.findUnique.mockResolvedValue(invitedTeam(5));
		await expect(acceptTeamInvite('u1', 2)).resolves.toMatchObject({ ok: false, status: 400 });
		expect(tx.cs2TeamInvitation.delete).toHaveBeenCalledWith({ where: { id: 5 } });
		expect(tx.cs2Team.update).not.toHaveBeenCalled();
	});
});
