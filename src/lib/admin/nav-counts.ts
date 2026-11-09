import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { userHasPermission } from '@/lib/helpers/permissions';
import { loadPool } from '@/lib/admin/servers';
import type { AdminSidebarData } from '@/lib/admin/nav-types';

/** Every sidebar count chip in one cached batch (shared across admins; 15s fallback, tag-invalidated on writes). */
const getAdminNavCounts = cachedQuery(
	async () => {
		const now = new Date();
		const [tournaments, matches, liveMatches, users, teams, badges, activeBans, forumThreads] = await Promise.all([
			db.cs2Tournament.count({ where: { isSystem: false } }),
			db.matches.count(),
			db.matches.count({ where: { status: 'LIVE' } }),
			db.user.count(),
			db.cs2Team.count(),
			db.badge.count(),
			db.userBan.count({ where: { liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
			db.forumThread.count(),
		]);
		return { tournaments, matches, liveMatches, users, teams, badges, activeBans, forumThreads };
	},
	['admin-nav-counts'],
	{ tags: [CACHE_TAGS.tournaments, CACHE_TAGS.matches, CACHE_TAGS.users, CACHE_TAGS.teams, CACHE_TAGS.forum], revalidate: REVALIDATE.live },
);

/**
 * Sidebar data for the signed-in staff member: their identity for the footer and the nav counts.
 * Resolves to null (never rejects) for anyone without `admin:access` or when the DB is unreachable,
 * so the sidebar just renders without chips.
 */
export async function getAdminSidebarData(): Promise<AdminSidebarData | null> {
	try {
		const session = await getAuthSession();
		if (!session || !(await userHasPermission(session.user.id, 'admin:access'))) return null;
		const counts = await getAdminNavCounts();
		const pool = await loadPool();
		return {
			user: { name: session.user.name ?? 'Staff', image: session.user.image ?? null, role: session.user.role ?? 'USER' },
			counts: { ...counts, servers: pool.ok ? pool.pool.length : null },
		};
	} catch (error) {
		// Let Next's own signals (dynamic rendering during prerender, redirects) through instead of logging them.
		unstable_rethrow(error);
		console.error('Error loading admin sidebar data:', error instanceof Error ? error.message : 'unknown error');
		return null;
	}
}
