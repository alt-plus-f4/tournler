import { NextResponse } from 'next/server';
import { notifyTeamInvite } from '@/lib/convex-server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getUserTeam, TEAM_SIZE } from '@/lib/teams/membership';
import { GAME_META } from '@/lib/games';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;

		if (!slug) {
			return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
		}

		const numericId = parseInt(slug, 10);

		if (isNaN(numericId)) {
			return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
		}

		const team = await db.cs2Team.findUnique({
			where: { id: numericId },
			select: {
				teamInvitations: true,
			},
		});

		if (!team) {
			return NextResponse.json({ error: 'Team not found' }, { status: 404 });
		}

		return NextResponse.json({ teamInvitations: team.teamInvitations }, { status: 200 });
	} catch (error) {
		console.error('Error fetching team invitations:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { slug } = await params;

		if (!slug) {
			return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
		}

		const numericId = parseInt(slug, 10);

		if (isNaN(numericId)) {
			return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
		}

		const { id } = await request.json();

		if (!id) {
			return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
		}

		const team = await db.cs2Team.findUnique({
			where: { id: numericId },
			select: {
				id: true,
				name: true,
				game: true,
				capitan: { select: { id: true } },
				members: { select: { id: true } },
				teamInvitations: { select: { userId: true } },
			},
		});

		if (!team) {
			return NextResponse.json({ error: 'Team not found' }, { status: 404 });
		}

		const isCaptain = team.capitan?.id === session.user.id;
		if (!isCaptain && !(await userHasPermission(session.user.id, 'teams:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		if (team.members.length >= TEAM_SIZE) {
			return NextResponse.json({ error: 'Team is full' }, { status: 400 });
		}

		if (team.members.some((member) => member.id === id)) {
			return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
		}

		if (team.teamInvitations.some((invite) => invite.userId === id)) {
			return NextResponse.json({ error: 'User has already been invited' }, { status: 400 });
		}

		const user = await db.user.findUnique({
			where: { id: id },
			select: { id: true },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// One team per game: accepting re-checks this too, but don't send an invite that can't be accepted.
		if (await getUserTeam(user.id, team.game)) {
			return NextResponse.json({ error: `Player is already on a ${GAME_META[team.game].label} team`, code: 'ALREADY_ON_TEAM' }, { status: 409 });
		}

		const teamInvitation = await db.cs2TeamInvitation.create({
			data: {
				teamId: numericId,
				userId: user.id,
			},
		});

		// Best effort: the invitation exists either way, and also shows on the invitee's profile.
		await notifyTeamInvite(user.id, team.id, team.name).catch((error) => console.error('Failed to send invite notification:', error));

		return NextResponse.json({ teamInvitation }, { status: 200 });
	} catch (error) {
		console.error('Error creating team invitation:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
