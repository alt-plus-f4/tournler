import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { startTournament, checkAndStartTournaments } from '@/lib/tournaments/tournament-service';
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

/**
 * GET /api/tournaments/check-start
 * Check for tournaments that should be started (admin/cron only)
 */
export async function GET(request: Request) {
	try {
		// This endpoint should be called by a cron job or admin
		// Add API key authentication for cron jobs
		const apiKey = request.headers.get('x-api-key');
		const session = await getAuthSession();

		const isAuthorized = apiKey === process.env.CRON_API_KEY || (session ? await userHasPermission(session.user.id, 'tournaments:manage') : false);

		if (!isAuthorized) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const result = await checkAndStartTournaments();

		return NextResponse.json({
			success: true,
			...result,
		});
	} catch (error) {
		console.error('Error checking tournaments:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
