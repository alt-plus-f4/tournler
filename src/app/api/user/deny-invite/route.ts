import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

		const body = await request.json();
		const userId = session.user.id;
		const { teamId } = body;

		if (!teamId) {
			return NextResponse.json(
				{ message: 'Missing teamId' },
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
