import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;

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
			members: true,
			capitan: true,
		},
	});

	if (!team) {
		return NextResponse.json({ error: 'Team not found' }, { status: 404 });
	}

	return NextResponse.json({ team }, { status: 200 });
}

export async function DELETE(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;
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
		const isMember = team.members.some(
			(member: { id: string }) => member.id === userId
		);
		if (!isMember) {
			return NextResponse.json(
				{ error: 'User not a member of the team' },
				{ status: 400 }
			);
		}

		const updatedMembers = team.members.filter(
			(member: { id: string }) => member.id !== userId
		);

		if (updatedMembers.length === 0) {
			await db.cs2Team.delete({ where: { id: numericId } });
			return NextResponse.json(
				{ message: 'Team deleted as the last member left' },
				{ status: 200 }
			);
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
			return NextResponse.json(
				{ message: 'User removed and new captain assigned' },
				{ status: 200 }
			);
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
			return NextResponse.json(
				{ message: 'User removed from the team' },
				{ status: 200 }
			);
		}
	} else {
		await db.cs2Team.delete({ where: { id: numericId } });
		return NextResponse.json({ message: 'Team deleted' }, { status: 200 });
	}
}
