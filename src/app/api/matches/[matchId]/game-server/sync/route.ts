import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { pushMatchConfigToServer } from '@/lib/cs2/provisioning';
import { withRcon } from '@/lib/cs2/rcon-client';
import { findServerByConnect } from '@/lib/cs2/server-pool';

/**
 * POST /api/matches/[matchId]/game-server/sync
 *
 * Manual escape hatch for when MatchZy's `matchzy_remote_log_url` webhook doesn't fire (a known
 * reliability caveat on some setups — see the comment in
 * `/api/matches/game-state/matchzy/route.ts`). Re-pushes this match's config over RCON
 * (idempotent — safe to repeat) and runs a read-only `status` query, returning the server's raw
 * response so an organizer can read the current score off it and enter it manually via the
 * existing admin score-update control if the webhook is stuck.
 *
 * This deliberately does NOT attempt to parse MatchZy's live match/round state via RCON — no
 * documented, stable RCON query command for that was confirmed during implementation. Wire up
 * real parsing here once one is verified against the deployed MatchZy version, instead of
 * guessing at a command that may not exist.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { matchId } = await params;
		const id = Number.parseInt(matchId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const match = await db.matches.findUnique({ where: { id }, include: { tournament: { select: { organizerId: true } } } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const canManageServers = await userHasPermission(session.user.id, 'servers:manage');
		if (match.tournament.organizerId !== session.user.id && !canManageServers) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await pushMatchConfigToServer(id);

		const gameServer = await db.gameServer.findUnique({ where: { matchId: id } });
		if (!gameServer) return NextResponse.json({ error: 'No game server found for this match' }, { status: 404 });

		const server = findServerByConnect(gameServer.connectIp, gameServer.port);
		if (!server) return NextResponse.json({ error: 'No CS2_SERVER_POOL entry matches this match\'s assigned server' }, { status: 500 });

		const status = await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute('status'));

		return NextResponse.json({ success: true, serverStatus: status });
	} catch (error) {
		console.error('Error syncing game server:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
