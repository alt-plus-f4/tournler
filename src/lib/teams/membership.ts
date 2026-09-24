import type { Game } from '@prisma/client';
import { db, type DbTx } from '@/lib/db';
import { GAME_META, GAMES } from '@/lib/games';

/**
 * Team membership rules (app-enforced; the schema only guarantees one captaincy per user per game):
 * a player is on at most ONE team per game, so a CS2 team and a LoL team at the same time is fine.
 * Every flow that adds a player to a team (create, invite, accept) goes through here, and the
 * writing flows run it inside `withJoinLock` so two concurrent requests can't both pass the check.
 */

export const TEAM_SIZE = 5;

type Client = typeof db | DbTx;

export function isGame(value: unknown): value is Game {
	return typeof value === 'string' && (GAMES as readonly string[]).includes(value);
}

export const userTeamSelect = { id: true, name: true, game: true, logo: true, capitanId: true } as const;
export type UserTeamSummary = { id: number; name: string; game: Game; logo: string | null; capitanId: string | null };
export type UserTeamsByGame = Record<Game, UserTeamSummary | null>;

export type MembershipErrorCode = 'ALREADY_ON_TEAM' | 'NAME_TAKEN';

export class MembershipError extends Error {
	constructor(
		readonly code: MembershipErrorCode,
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = 'MembershipError';
	}
}

/** A user counts as "on" a team if they're a member or (defensively) its captain. */
const onTeamWhere = (userId: string, game: Game) => ({ game, OR: [{ members: { some: { id: userId } } }, { capitanId: userId }] });

/** The user's team for one game, or null. */
export async function getUserTeam(userId: string, game: Game, client: Client = db): Promise<UserTeamSummary | null> {
	return client.cs2Team.findFirst({ where: onTeamWhere(userId, game), select: userTeamSelect, orderBy: { id: 'asc' } });
}

/** The user's teams keyed by game (null where they have none). */
export async function getUserTeams(userId: string, client: Client = db): Promise<UserTeamsByGame> {
	const rows = await client.cs2Team.findMany({ where: { OR: [{ members: { some: { id: userId } } }, { capitanId: userId }] }, select: userTeamSelect, orderBy: { id: 'asc' } });
	const out = Object.fromEntries(GAMES.map((g) => [g, null])) as UserTeamsByGame;
	for (const row of rows) out[row.game] ??= row;
	return out;
}

/** Throws a MembershipError (409) when the user already plays for a team of `game`. */
export async function assertCanJoin(userId: string, game: Game, client: Client = db): Promise<void> {
	const existing = await getUserTeam(userId, game, client);
	if (existing) {
		throw new MembershipError('ALREADY_ON_TEAM', `Already on a ${GAME_META[game].label} team (${existing.name}). Leave it first.`, 409);
	}
}

/**
 * Run `fn` in a transaction holding row locks on the user (and team, when given), so concurrent
 * create/accept requests for the same player (or the last open slot of a team) serialize and the
 * membership checks inside `fn` see each other's writes.
 */
export async function withJoinLock<T>(userId: string, teamId: number | null, fn: (tx: DbTx) => Promise<T>): Promise<T> {
	return db.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
		if (teamId !== null) await tx.$queryRaw`SELECT id FROM "cs2_teams" WHERE id = ${teamId} FOR UPDATE`;
		return fn(tx);
	});
}

/**
 * Accept an invitation: re-checks the one-team-per-game rule and the roster cap under lock, adds
 * the player, and drops the used invite plus any other pending invites from teams of that game
 * (they could no longer be accepted anyway). A full team also loses the invite.
 */
export async function acceptTeamInvite(userId: string, teamId: number) {
	return withJoinLock(userId, teamId, async (tx) => {
		const invitation = await tx.cs2TeamInvitation.findFirst({ where: { userId, teamId }, select: { id: true } });
		if (!invitation) return { ok: false as const, status: 404, message: 'Invitation not found' };

		const team = await tx.cs2Team.findUnique({ where: { id: teamId }, select: { id: true, game: true, _count: { select: { members: true } } } });
		if (!team) {
			await tx.cs2TeamInvitation.delete({ where: { id: invitation.id } });
			return { ok: false as const, status: 404, message: 'Team not found' };
		}
		if (team._count.members >= TEAM_SIZE) {
			await tx.cs2TeamInvitation.delete({ where: { id: invitation.id } });
			return { ok: false as const, status: 400, message: `Team already has ${TEAM_SIZE} members, invitation removed` };
		}

		await assertCanJoin(userId, team.game, tx);

		await tx.cs2Team.update({ where: { id: teamId }, data: { members: { connect: { id: userId } } } });
		await tx.cs2TeamInvitation.deleteMany({ where: { userId, team: { game: team.game } } });
		return { ok: true as const, game: team.game };
	});
}

/**
 * Create a team for `game` with the user as captain and first member. Name is unique per game.
 * Throws MembershipError (ALREADY_ON_TEAM / NAME_TAKEN, both 409) for the route to map to a status.
 */
export async function createTeam(userId: string, name: string, game: Game) {
	return withJoinLock(userId, null, async (tx) => {
		await assertCanJoin(userId, game, tx);
		const taken = await tx.cs2Team.findFirst({ where: { game, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
		if (taken) throw new MembershipError('NAME_TAKEN', `A ${GAME_META[game].short} team called "${name}" already exists`, 409);
		const team = await tx.cs2Team.create({ data: { name, game, members: { connect: { id: userId } }, capitan: { connect: { id: userId } } } });
		// Invites from other teams of this game can't be accepted any more.
		await tx.cs2TeamInvitation.deleteMany({ where: { userId, team: { game } } });
		return team;
	});
}
