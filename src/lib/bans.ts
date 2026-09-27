import type { Prisma, UserRole } from '@prisma/client';
import { db } from '@/lib/db';

/** Prisma filter for a ban that is currently in force. */
export function activeBanWhere(now = new Date()): Prisma.UserBanWhereInput {
	return { liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export type ActiveBan = { id: number; reason: string; expiresAt: string | null; createdAt: string };

export function toActiveBan(ban: { id: number; reason: string; expiresAt: Date | null; createdAt: Date } | null | undefined): ActiveBan | null {
	if (!ban) return null;
	return { id: ban.id, reason: ban.reason, expiresAt: ban.expiresAt?.toISOString() ?? null, createdAt: ban.createdAt.toISOString() };
}

export async function getActiveBan(userId: string): Promise<ActiveBan | null> {
	const ban = await db.userBan.findFirst({ where: { userId, ...activeBanWhere() }, orderBy: { createdAt: 'desc' } });
	return toActiveBan(ban);
}

const RANK: Record<UserRole, number> = { USER: 0, MODERATOR: 1, TOURNAMENT_ADMIN: 1, CONTENT_ADMIN: 1, ADMIN: 2 };

/**
 * Who may ban whom: never yourself, never an ADMIN, and staff can only be banned by an ADMIN.
 * Returns a human-readable reason when not allowed.
 */
export function banBlockedReason(actor: { id: string; role: UserRole }, target: { id: string; role: UserRole }): string | null {
	if (actor.id === target.id) return "You can't ban yourself.";
	if (target.role === 'ADMIN') return "Admins can't be banned.";
	if (RANK[target.role] >= RANK[actor.role]) return 'Only an admin can ban staff members.';
	return null;
}

export const BAN_DURATIONS = {
	'1d': 1,
	'3d': 3,
	'7d': 7,
	'30d': 30,
	permanent: null,
} as const satisfies Record<string, number | null>;

export type BanDuration = keyof typeof BAN_DURATIONS;
