import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { TournamentStatus } from '@prisma/client';

interface ActivityItem {
	type: 'user' | 'team' | 'tournament';
	id: string;
	name: string;
	href: string;
	createdAt: string;
}

/**
 * GET /api/admin/dashboard
 * Consolidates everything the admin overview page needs into one request:
 * plain totals, the existing per-resource chart shapes (kept unchanged so
 * the dashboard's charts keep working as-is), and a merged recent-activity
 * feed. Gated on the coarse `admin:access` permission (same as the layout)
 * rather than per-resource permissions — this is read-only aggregate/overview
 * data, not the management capability itself, which the individual admin
 * pages still gate on their specific `*:manage` permission.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!(await userHasPermission(session.user.id, 'admin:access'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const [totalUsers, totalTeams, totalTournaments, ongoingTournaments, usersInTeam, usersNotInTeam, teamsForVerification, ended, upcoming, recentUsers, recentTeams, recentTournaments] = await Promise.all([
			db.user.count(),
			db.cs2Team.count(),
			db.cs2Tournament.count({ where: { isSystem: false } }),
			db.cs2Tournament.count({ where: { isSystem: false, status: TournamentStatus.ONGOING } }),
			db.user.count({ where: { cs2TeamId: { not: null } } }),
			db.user.count({ where: { cs2TeamId: null } }),
			db.cs2Team.findMany({ where: { members: { some: {} } }, select: { _count: { select: { members: true } } } }),
			db.cs2Tournament.count({ where: { isSystem: false, status: TournamentStatus.COMPLETED } }),
			db.cs2Tournament.count({ where: { isSystem: false, status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } } }),
			db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, createdAt: true } }),
			db.cs2Team.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, createdAt: true } }),
			db.cs2Tournament.findMany({ where: { isSystem: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, createdAt: true } }),
		]);

		const verifiedTeams = teamsForVerification.filter((team) => team._count.members === 5).length;
		const notFullTeams = teamsForVerification.filter((team) => team._count.members < 5).length;

		const recentActivity: ActivityItem[] = [
			...recentUsers.map((u): ActivityItem => ({ type: 'user', id: u.id, name: u.name || u.email, href: `/profile/${u.id}`, createdAt: u.createdAt.toISOString() })),
			...recentTeams.map((t): ActivityItem => ({ type: 'team', id: String(t.id), name: t.name, href: `/teams/${t.id}`, createdAt: t.createdAt.toISOString() })),
			...recentTournaments.map((t): ActivityItem => ({ type: 'tournament', id: String(t.id), name: t.name, href: `/tournaments/${t.id}`, createdAt: t.createdAt.toISOString() })),
		]
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, 10);

		return NextResponse.json({
			totals: { users: totalUsers, teams: totalTeams, tournaments: totalTournaments, ongoingTournaments },
			usersInTeam,
			usersNotInTeam,
			verifiedTeams,
			notFullTeams,
			ended,
			upcoming,
			recentActivity,
		});
	} catch (error) {
		console.error('Error fetching admin dashboard data:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
