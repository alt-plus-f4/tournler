import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * The team a user plays for (`{ team: { id, name } | null }`), read directly from the DB rather
 * than via GET /api/user/team over HTTP. Cached per request.
 */
export const fetchUserTeam = cache(async function fetchUserTeam(userId: string) {
	try {
		const user = await db.user.findUnique({ where: { id: userId }, select: { cs2Team: { select: { id: true, name: true } } } });
		return { team: user?.cs2Team ?? null };
	} catch {
		return null;
	}
});
