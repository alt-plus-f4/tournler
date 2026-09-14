import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/helpers/safe-equal';
import { buildMatchConfig } from '@/lib/cs2/match-config';

/**
 * GET /api/matches/[matchId]/game-server/match-config
 * Served to the real CS2 server via MatchZy's `matchzy_loadmatch_url` (an HTTP GET, not a
 * browser request) — authenticated the same way as the game-state webhook, via a shared
 * secret header, not a user session.
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const token = request.headers.get('x-game-server-token');
		const expectedToken = process.env.GAME_SERVER_TOKEN;
		if (!token || !expectedToken || !safeEqual(token, expectedToken)) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const { matchId } = await params;
		const id = Number.parseInt(matchId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const config = await buildMatchConfig(id);
		return NextResponse.json(config);
	} catch (error) {
		console.error('Error building match config:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
