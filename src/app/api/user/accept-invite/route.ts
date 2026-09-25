import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { acceptTeamInvite, MembershipError } from '@/lib/teams/membership';

export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

		const body = await request.json().catch(() => null);
		const teamId = Number(body?.teamId);
		if (!body?.teamId || !Number.isInteger(teamId)) {
			return NextResponse.json({ message: 'Missing teamId' }, { status: 400 });
		}

		// Re-checks one-team-per-game and the roster cap inside a locked transaction.
		const result = await acceptTeamInvite(session.user.id, teamId);
		if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

		return NextResponse.json({ message: 'Player added to the team and invitation removed', game: result.game });
	} catch (error) {
		if (error instanceof MembershipError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
		console.error('Error accepting team invite:', error);
		return NextResponse.json({ message: 'Failed to accept team invite' }, { status: 500 });
	}
}
