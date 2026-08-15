import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { startTournament } from '@/lib/tournaments/tournament-service';
import { NextResponse } from 'next/server';

/**
 * POST /api/tournaments/start
 * Manually start a tournament (admin only)
 */
export async function POST(request: Request) {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!(await userHasPermission(session.user.id, 'tournaments:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { tournamentId } = await request.json();

		if (!tournamentId) {
			return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
		}

		const result = await startTournament(tournamentId);

		return NextResponse.json({
			success: true,
			tournament: result.tournament,
			matchesCreated: result.matchesCreated,
		});
	} catch (error) {
		console.error('Error starting tournament:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
