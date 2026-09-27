import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

const RESULT_LIMIT = 20;

/**
 * GET /api/teams/[slug]/invitable-users?search=<query>
 *
 * Backs `UsersSearch`'s invite-a-player search box — replaces the old prefetch-every-user-into-
 * the-page approach (`fetchUsersNotInTheTeam`, passed down as a full `allUsers` prop) with an
 * on-demand, capped, server-side-filtered lookup as the captain types (see GitHub issue #69).
 * Only that team's captain can invite, so only they can search here. Players already on a team of
 * the same game aren't invitable (see src/lib/teams/membership.ts).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { slug } = await params;
		const teamId = Number.parseInt(slug, 10);
		if (Number.isNaN(teamId)) return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });

		const team = await db.cs2Team.findUnique({ where: { id: teamId }, select: { capitanId: true, game: true } });
		if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
		if (team.capitanId !== session.user.id) return NextResponse.json({ error: 'Only the team captain can search for players to invite' }, { status: 403 });

		const search = new URL(request.url).searchParams.get('search')?.trim();
		// An empty search still returns a first page of candidates (matches the old "show everyone"
		// starting view) — just capped, not the entire user table. One team per game: anyone already
		// on (or captaining) a team of this team's game is left out, which also excludes this roster.
		const where = {
			AND: [
				{ teams: { none: { game: team.game } } },
				{ captainOf: { none: { game: team.game } } },
				...(search ? [{ OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }] : []),
			],
		};

		const users = await db.user.findMany({
			where,
			select: { id: true, name: true, email: true, image: true },
			take: RESULT_LIMIT,
			orderBy: { name: 'asc' },
		});

		return NextResponse.json({ users });
	} catch (error) {
		console.error('Error searching invitable users:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
