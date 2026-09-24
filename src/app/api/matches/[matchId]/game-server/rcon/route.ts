import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { withRcon } from '@/lib/cs2/rcon-client';
import { findServerByConnect } from '@/lib/cs2/server-pool';
import { HostedServerUnsupportedError, hostsGameServers } from '@/lib/tournaments/game-rules';

const MAX_COMMAND_LENGTH = 512;

/**
 * POST /api/matches/[matchId]/game-server/rcon
 *
 * Runs one raw RCON command against the real CS2 server assigned to this match and returns its
 * console output. Same authorization as the existing sync endpoint (tournament organizer or
 * `servers:manage`) since this is a strictly more powerful capability — it's the escape hatch for
 * debugging/fixing a match's server by hand (checking `status`, reloading the match config,
 * nudging MatchZy) when the automated webhook/RCON push path (`pushMatchConfigToServer`,
 * `POST /api/matches/game-state/matchzy`) hasn't done what was expected.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const id = Number.parseInt(matchId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const match = await db.matches.findUnique({ where: { id }, include: { tournament: { select: { organizerId: true, game: true } } } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const canManageServers = await userHasPermission(session.user.id, 'servers:manage');
		if (match.tournament.organizerId !== session.user.id && !canManageServers) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}
		if (!hostsGameServers(match.tournament.game)) {
			return NextResponse.json({ error: new HostedServerUnsupportedError(match.tournament.game, 'send RCON commands to').message }, { status: 409 });
		}

		const body = await request.json().catch(() => null);
		const command = typeof body?.command === 'string' ? body.command.trim() : '';
		if (!command) return NextResponse.json({ error: 'A command is required' }, { status: 400 });
		if (command.length > MAX_COMMAND_LENGTH) return NextResponse.json({ error: `Command too long (max ${MAX_COMMAND_LENGTH} characters)` }, { status: 400 });

		const gameServer = await db.gameServer.findUnique({ where: { matchId: id } });
		if (!gameServer) return NextResponse.json({ error: 'No game server has been provisioned for this match yet' }, { status: 404 });

		const server = findServerByConnect(gameServer.connectIp, gameServer.port);
		if (!server) return NextResponse.json({ error: "No CS2_SERVER_POOL entry matches this match's assigned server" }, { status: 500 });

		const output = await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute(command));

		return NextResponse.json({ success: true, output });
	} catch (error) {
		console.error('Error running RCON command:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
