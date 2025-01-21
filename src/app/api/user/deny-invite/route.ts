import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { userId, teamId } = body;

		if (!userId || !teamId) {
			return NextResponse.json(
				{ message: 'Missing userId or teanmId' },
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

		await db.cs2TeamInvitation.delete({
			where: { id: invitation.id },
		});

		return NextResponse.json({
			message: 'Invitation denied and removed successfully',
		});
	} catch (error) {
		console.error('Error denying team invite:', error);
		return NextResponse.json(
			{ message: 'Failed to deny team invite', error: error },
			{ status: 500 }
		);
	}
}
