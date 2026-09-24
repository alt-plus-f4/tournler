import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { flairMapper, playerFlairSelect } from '@/lib/helpers/player-flair';

const publicUserSelect = { id: true, name: true, image: true } as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
			id: true,
			name: true,
			game: true,
			logo: true,
			background: true,
			// Public endpoint: only the fields the team page renders. `members: true` used to
			// return whole User rows (email, role, ...) to anonymous callers.
			// Steam ID + Verified badge are read only to compute `verified`/`faceitLevel` below and
			// are stripped before the response.
			// bio feeds the roster hover card (public profile text).
			members: { select: { ...publicUserSelect, bio: true, ...playerFlairSelect } },
			capitan: { select: publicUserSelect },
		},
	});

	if (!team) {
		return NextResponse.json({ error: 'Team not found' }, { status: 404 });
	}

	const withFlair = await flairMapper(team.members);
	return NextResponse.json({ team: { ...team, members: team.members.map(withFlair) } }, { status: 200 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { slug } = await params;
	const { userId } = await request.json();

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
			id: true,
			capitan: true,
			members: true,
		},
	});

	if (!team) {
		return NextResponse.json({ error: 'Team not found' }, { status: 404 });
	}

	const isCaptain = team.capitan?.id === session.user.id;
	const canManage = isCaptain || (await userHasPermission(session.user.id, 'teams:manage'));

	if (userId) {
		// Removing a specific member: allowed for that member themself, the captain, or teams:manage
		if (session.user.id !== userId && !canManage) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}
		const isMember = team.members.some((member: { id: string }) => member.id === userId);
		if (!isMember) {
			return NextResponse.json({ error: 'User not a member of the team' }, { status: 400 });
		}

		const updatedMembers = team.members.filter((member: { id: string }) => member.id !== userId);

		if (updatedMembers.length === 0) {
			await db.cs2Team.delete({ where: { id: numericId } });
			return NextResponse.json({ message: 'Team deleted as the last member left' }, { status: 200 });
		}

		if (team.capitan?.id === userId) {
			await db.cs2Team.update({
				where: { id: numericId },
				data: {
					members: {
						set: updatedMembers.map((member: { id: string }) => ({
							id: member.id,
						})),
					},
					capitan: { connect: { id: updatedMembers[0].id } },
				},
			});
			return NextResponse.json({ message: 'User removed and new captain assigned' }, { status: 200 });
		} else {
			await db.cs2Team.update({
				where: { id: numericId },
				data: {
					members: {
						set: updatedMembers.map((member: { id: string }) => ({
							id: member.id,
						})),
					},
				},
			});
			return NextResponse.json({ message: 'User removed from the team' }, { status: 200 });
		}
	} else {
		// Deleting the whole team: captain or teams:manage only
		if (!canManage) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.cs2Team.delete({ where: { id: numericId } });
		return NextResponse.json({ message: 'Team deleted' }, { status: 200 });
	}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		if (!slug) return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });

		const numericId = parseInt(slug, 10);
		if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });

		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const team = await db.cs2Team.findUnique({ where: { id: numericId }, include: { capitan: true, members: { select: { id: true } } } });
		if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

		const allowedToEdit = team.capitan?.id === session.user.id || (await userHasPermission(session.user.id, 'teams:manage'));
		if (!allowedToEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

		const body = await request.json();
		if (!body || Object.keys(body).length === 0) return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });

		const allowedFields = ['name', 'logo', 'background', 'capitanId', 'cs2TournamentId'];
		const dataToUpdate: Record<string, any> = {};
		for (const key of allowedFields) {
			if (body[key] !== undefined) dataToUpdate[key] = body[key];
		}

		if (Object.keys(dataToUpdate).length === 0) return NextResponse.json({ error: 'No valid fields to update provided' }, { status: 400 });

		// The captain must be on the roster; that also keeps "one captaincy per game" true, since a
		// member can't be on (let alone captain) another team of this game.
		if (dataToUpdate.capitanId !== undefined && dataToUpdate.capitanId !== null && !team.members.some((m) => m.id === dataToUpdate.capitanId)) {
			return NextResponse.json({ error: 'The new captain must be a member of the team' }, { status: 400 });
		}

		// coerce numeric tournament id if provided
		if (dataToUpdate.cs2TournamentId !== undefined) {
			const n = Number(dataToUpdate.cs2TournamentId);
			if (Number.isNaN(n)) return NextResponse.json({ error: 'cs2TournamentId must be a number' }, { status: 400 });
			dataToUpdate.cs2TournamentId = n;
		}

		const updated = await db.cs2Team.update({ where: { id: numericId }, data: dataToUpdate });

		return NextResponse.json({ message: 'Team updated', team: updated }, { status: 200 });
	} catch (error) {
		// (name, game) is unique: another team of this game already has the new name.
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Team name is already taken for this game' }, { status: 409 });
		console.error('Error updating team:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
