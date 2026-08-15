import { db } from '@/lib/db';
import { safeEqual } from '@/lib/helpers/safe-equal';
import { MatchResultConflictError, recordMatchResult } from '@/lib/tournaments/bracket-advancement';
import { upsertPlayerMatchStats, PlayerStatInput } from '@/lib/tournaments/player-stats';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

interface GameStateUpdate {
	matchId: number;
	teamAScore: number;
	teamBScore: number;
	isCompleted: boolean;
	winnerId?: number;
	playerStats?: PlayerStatInput[];
}

function isValidPlayerStats(value: unknown): value is PlayerStatInput[] {
	if (!Array.isArray(value)) return false;
	return value.every((entry) => entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).userId === 'string' && typeof (entry as Record<string, unknown>).teamId === 'number' && typeof (entry as Record<string, unknown>).kills === 'number' && typeof (entry as Record<string, unknown>).deaths === 'number' && typeof (entry as Record<string, unknown>).assists === 'number');
}

function isValidGameStateUpdate(payload: unknown): payload is GameStateUpdate {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const data = payload as Record<string, unknown>;
	if (typeof data.matchId !== 'number' || typeof data.teamAScore !== 'number' || typeof data.teamBScore !== 'number' || typeof data.isCompleted !== 'boolean') {
		return false;
	}
	if (data.winnerId !== undefined && typeof data.winnerId !== 'number') return false;
	if (data.playerStats !== undefined && !isValidPlayerStats(data.playerStats)) return false;
	return true;
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
		const expectedToken = process.env.GAME_SERVER_TOKEN;

		if (!gameServerToken || !expectedToken || !safeEqual(gameServerToken, expectedToken)) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const body: unknown = await request.json();
		if (!isValidGameStateUpdate(body)) {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}

		const update = body;

		if (update.isCompleted && update.winnerId === undefined) {
			return NextResponse.json({ error: 'winnerId is required when isCompleted is true' }, { status: 400 });
		}

		const updatedMatch = await recordMatchResult(update.matchId, {
			scoreTeamA: update.teamAScore,
			scoreTeamB: update.teamBScore,
			winnerId: update.isCompleted ? update.winnerId : undefined,
		});

		if (update.isCompleted && update.winnerId) {
			await db.gameServer.updateMany({
				where: { matchId: update.matchId },
				data: { status: 'COMPLETED' },
			});
		}

		if (update.playerStats && update.playerStats.length > 0) {
			await upsertPlayerMatchStats(update.matchId, update.playerStats);
		}

		const matchWithTeams = await db.matches.findUnique({
			where: { id: update.matchId },
			include: { teamA: true, teamB: true, winner: true },
		});

		return NextResponse.json({
			success: true,
			match: matchWithTeams ?? updatedMatch,
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
