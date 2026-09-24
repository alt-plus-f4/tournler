import 'server-only';
import type { Game } from '@prisma/client';
import { db } from '@/lib/db';
import { GAME_META } from './index';

export type AccountStatus = 'linked' | 'pending' | 'missing';

/**
 * Whether each user has the account a game requires: Steam for CS2 (linked via Steam OpenID),
 * a verified Riot ID for LoL (pending = entered but the ownership check isn't done).
 */
export async function gameAccountStatus(userIds: string[], game: Game): Promise<Map<string, AccountStatus>> {
	const out = new Map<string, AccountStatus>(userIds.map((id) => [id, 'missing']));
	if (userIds.length === 0) return out;
	if (game === 'CS2') {
		const rows = await db.steamAccount.findMany({ where: { userId: { in: userIds } }, select: { userId: true } });
		for (const r of rows) out.set(r.userId, 'linked');
	} else {
		const rows = await db.riotAccount.findMany({ where: { userId: { in: userIds } }, select: { userId: true, verifiedAt: true } });
		for (const r of rows) out.set(r.userId, r.verifiedAt ? 'linked' : 'pending');
	}
	return out;
}

export type EligibilityResult = { ok: true } | { ok: false; reason: string; missing: { id: string; name: string | null; status: AccountStatus }[] };

/**
 * A team can register for a tournament only if it plays that tournament's game and every rostered
 * player has that game's account linked. Used by the registration API (enforcement) and the
 * registration gate UI (explanation). Same rule both places, so the UI never promises what the API refuses.
 */
export async function teamEligibility(teamId: number, tournamentGame: Game): Promise<EligibilityResult> {
	const team = await db.cs2Team.findUnique({ where: { id: teamId }, select: { game: true, members: { select: { id: true, name: true } } } });
	if (!team) return { ok: false, reason: 'Team not found', missing: [] };
	const meta = GAME_META[tournamentGame];
	if (team.game !== tournamentGame) return { ok: false, reason: `This is a ${meta.label} tournament; your team plays ${GAME_META[team.game].label}.`, missing: [] };
	const status = await gameAccountStatus(team.members.map((m) => m.id), tournamentGame);
	const missing = team.members.filter((m) => status.get(m.id) !== 'linked').map((m) => ({ ...m, status: status.get(m.id)! }));
	if (missing.length > 0) return { ok: false, reason: `Every player needs a linked ${meta.account} to register.`, missing };
	return { ok: true };
}
