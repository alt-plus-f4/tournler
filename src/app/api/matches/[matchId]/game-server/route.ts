import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { NextResponse } from 'next/server';

/**
 * POST /api/matches/[matchId]/game-server
 * Create a game server instance for a match
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) {
			return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
		}

		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const match = await db.matches.findUnique({
			where: { id: parsedMatchId },
			include: {
				teamA: { include: { members: true } },
				teamB: { include: { members: true } },
				tournament: { include: { organizer: true } },
			},
		});

		if (!match) {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}

		const canManageServers = await userHasPermission(session.user.id, 'servers:manage');

		// Tournament organizer or privileged staff can create game servers
		if (match.tournament.organizerId !== session.user.id && !canManageServers) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Check if game server already exists for this match
		const existingServer = await db.gameServer.findUnique({
			where: { matchId: match.id },
		});

		if (existingServer) {
			return NextResponse.json({ gameServer: existingServer }, { status: 200 });
		}

		// Generate connect IP and credentials
		// In production, this would call a Docker API to create a container
		// For now, we'll simulate it
		const connectIp = process.env.GAME_SERVER_IP || 'localhost';
		const port = 27015 + match.id; // Simple port allocation
		const password = Math.random().toString(36).substring(7);

		// Create game server record
		const gameServer = await db.gameServer.create({
			data: {
				matchId: match.id,
				connectIp,
				port,
				password,
				status: 'RUNNING',
			},
		});

		return NextResponse.json({
			success: true,
			gameServer,
			connectUrl: `${connectIp}:${port}`,
			password,
		});
	} catch (error) {
		console.error('Error creating game server:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}

/**
 * GET /api/matches/[matchId]/game-server
 * Get game server info for a match
 */
export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const { matchId } = await params;
		const parsedMatchId = Number.parseInt(matchId, 10);
		if (Number.isNaN(parsedMatchId)) {
			return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
		}

		const gameServer = await db.gameServer.findUnique({
			where: { matchId: parsedMatchId },
		});

		if (!gameServer) {
			return NextResponse.json({ error: 'No game server found for this match' }, { status: 404 });
		}

		return NextResponse.json({ gameServer });
	} catch (error) {
		console.error('Error fetching game server:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
