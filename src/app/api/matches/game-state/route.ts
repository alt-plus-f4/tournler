import { safeEqual } from '@/lib/helpers/safe-equal';
import { MatchResultConflictError } from '@/lib/tournaments/bracket-advancement';
import { applyGameStateUpdate, isValidGameStateUpdate } from '@/lib/tournaments/game-state';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * POST /api/matches/game-state
 * Receive game state updates from game servers
 * Should include X-Game-Server-Token header for authentication
 */
export async function POST(request: Request) {
	try {
		// Verify the request is coming from a valid game server
		const gameServerToken = request.headers.get('x-game-server-token');
		const expectedToken = process.env.GAME_SERVER_TOKEN;

		if (!gameServerToken || !expectedToken || !safeEqual(gameServerToken, expectedToken)) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const body: unknown = await request.json();
		if (!isValidGameStateUpdate(body)) {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}

		if (body.isCompleted && body.winnerId === undefined && body.winnerSide === undefined) {
			return NextResponse.json({ error: 'winnerId (or winnerSide, for pickup matches) is required when isCompleted is true' }, { status: 400 });
		}

		const match = await applyGameStateUpdate(body);

		return NextResponse.json({
			success: true,
			match,
		});
	} catch (error) {
		if (error instanceof MatchResultConflictError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}
		console.error('Error updating game state:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
