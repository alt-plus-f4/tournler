import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

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
			logo: true,
			background: true,
			members: true,
			capitan: true,
		},
	});

	if (!team) {
		return NextResponse.json({ error: 'Team not found' }, { status: 404 });
	}

	return NextResponse.json({ team }, { status: 200 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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

	if (userId) {
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

		const team = await db.cs2Team.findUnique({ where: { id: numericId }, include: { capitan: true } });
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

		// coerce numeric tournament id if provided
		if (dataToUpdate.cs2TournamentId !== undefined) {
			const n = Number(dataToUpdate.cs2TournamentId);
			if (Number.isNaN(n)) return NextResponse.json({ error: 'cs2TournamentId must be a number' }, { status: 400 });
			dataToUpdate.cs2TournamentId = n;
		}

		const updated = await db.cs2Team.update({ where: { id: numericId }, data: dataToUpdate });

		return NextResponse.json({ message: 'Team updated', team: updated }, { status: 200 });
	} catch (error) {
		console.error('Error updating team:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
