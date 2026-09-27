import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { ensureGameServer } from '@/lib/tournaments/game-server';
import { pushMatchConfigToServer } from '@/lib/cs2/provisioning';
import { HostedServerUnsupportedError, hostsGameServers } from '@/lib/tournaments/game-rules';
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

		if (!hostsGameServers(match.tournament.game)) {
			return NextResponse.json({ error: new HostedServerUnsupportedError(match.tournament.game, 'provision').message }, { status: 409 });
		}

		const { gameServer, created } = await ensureGameServer(db, match.id);

		if (!created) {
			return NextResponse.json({ gameServer }, { status: 200 });
		}

		try {
			await pushMatchConfigToServer(match.id);
		} catch (error) {
			console.error(`Failed to push match config to game server for match ${match.id}:`, error);
		}

		return NextResponse.json({
			success: true,
			gameServer,
			connectUrl: `${gameServer.connectIp}:${gameServer.port}`,
			password: gameServer.password,
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

		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const match = await db.matches.findUnique({
			where: { id: parsedMatchId },
			include: {
				teamA: { include: { members: true } },
				teamB: { include: { members: true } },
				tournament: { select: { organizerId: true } },
			},
		});

		if (!match) {
			return NextResponse.json({ error: 'Match not found' }, { status: 404 });
		}

		const isParticipant = [...(match.teamA?.members ?? []), ...(match.teamB?.members ?? [])].some((member) => member.id === session.user.id);
		const isOrganizer = match.tournament.organizerId === session.user.id;
		const canManageServers = await userHasPermission(session.user.id, 'servers:manage');

		if (!isParticipant && !isOrganizer && !canManageServers) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
