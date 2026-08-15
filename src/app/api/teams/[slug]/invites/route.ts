import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

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

		if (team.members.length >= 5) {
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

		const teamInvitation = await db.cs2TeamInvitation.create({
			data: {
				teamId: numericId,
				userId: user.id,
			},
		});

		return NextResponse.json({ teamInvitation }, { status: 200 });
	} catch (error) {
		console.error('Error creating team invitation:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
