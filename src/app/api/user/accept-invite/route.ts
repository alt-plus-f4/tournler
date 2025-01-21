import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
	try {
		const body = await request.json();

		const { userId, teamId } = body;

		if (!userId || !teamId) {
			return NextResponse.json(
				{ message: 'Missing userId or teamId' },
				{ status: 400 }
			);
		}

		const invitation = await db.cs2TeamInvitation.findFirst({
			where: { userId, teamId },
		});

		if (!invitation) {
			return NextResponse.json(
				{ message: 'Invitation not found' },
				{ status: 404 }
			);
		}

		const team = await db.cs2Team.findFirst({
			where: { id: teamId },
			include: { members: true },
		});

		if (team && team.members.length >= 5) {
			await db.cs2TeamInvitation.delete({
				where: { id: invitation.id },
			});
			return NextResponse.json(
				{ message: 'Team already has 5 members, invitation removed' },
				{ status: 400 }
			);
		}

		await db.cs2TeamInvitation.delete({
			where: { id: invitation.id },
		});

		await db.cs2Team.update({
			where: { id: invitation.teamId },
			data: {
				members: {
					connect: { id: userId },
				},
			},
		});

		return NextResponse.json({
			message: 'Player added to the team and invitation removed',
		});
	} catch (error) {
		console.error('Error accepting team invite:', error);
		return NextResponse.json(
			{ message: 'Failed to accept team invite', error: error },
			{ status: 500 }
		);
	}
}
