import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface GameStateUpdate {
	matchId: number;
	teamAScore: number;
	teamBScore: number;
	isCompleted: boolean;
	winnerId?: number;
}

function isValidGameStateUpdate(payload: unknown): payload is GameStateUpdate {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const data = payload as Record<string, unknown>;
	return typeof data.matchId === 'number' && typeof data.teamAScore === 'number' && typeof data.teamBScore === 'number' && typeof data.isCompleted === 'boolean' && (data.winnerId === undefined || typeof data.winnerId === 'number');
}

/**
 * POST /api/matches/game-state
 * Receive game state updates from game servers
 * Should include X-Game-Server-Token header for authentication
 */
export async function POST(request: Request) {
	try {
		// Verify the request is coming from a valid game server
		const gameServerToken = request.headers.get('x-game-server-token');

		if (gameServerToken !== process.env.GAME_SERVER_TOKEN) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const body: unknown = await request.json();
		if (!isValidGameStateUpdate(body)) {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}

		const update = body;

		if (!update.matchId) {
			return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
		}

		// Fetch the match
		const match = await db.matches.findUnique({
			where: { id: update.matchId },
		});

		if (!match) {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}

		// Update match scores
		const updateData: {
			scoreTeamA: number;
			scoreTeamB: number;
			winnerId?: number;
		} = {
			scoreTeamA: update.teamAScore,
			scoreTeamB: update.teamBScore,
		};

		// If match is completed, set the winner
		if (update.isCompleted && update.winnerId) {
			updateData.winnerId = update.winnerId;

			// Update game server status to COMPLETED
			await db.gameServer.updateMany({
				where: { matchId: update.matchId },
				data: { status: 'COMPLETED' },
			});
		}

		const updatedMatch = await db.matches.update({
			where: { id: update.matchId },
			data: updateData,
			include: {
				teamA: true,
				teamB: true,
				winner: true,
			},
		});

		return NextResponse.json({
			success: true,
			match: updatedMatch,
		});
	} catch (error) {
		console.error('Error updating game state:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
