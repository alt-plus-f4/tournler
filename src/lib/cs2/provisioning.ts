import { db } from '@/lib/db';
import { withRcon } from './rcon-client';
import { findServerByConnect, Cs2ServerConfig } from './server-pool';

/** Resolves the real CS2 server (pool entry) a match was assigned to, by its recorded GameServer row. */
async function resolveMatchServer(matchId: number): Promise<Cs2ServerConfig> {
	const gameServer = await db.gameServer.findUniqueOrThrow({ where: { matchId } });
	const server = findServerByConnect(gameServer.connectIp, gameServer.port);
	if (!server) {
		throw new Error(`No CS2_SERVER_POOL entry matches this match's assigned server (${gameServer.connectIp}:${gameServer.port}) — was the pool config changed after the match started?`);
	}
	return server;
}

/**
 * Runs one raw admin console command against a match's assigned server over RCON — the shared
 * primitive behind pauseMatch/resumeMatch/restartMatch pushing their action through to the real
 * server (MatchZy's `css_forcepause`/`css_forceunpause`/`css_restart` — all verified against
 * MatchZy's `dev` branch `ConsoleCommands.cs`; RCON invocations run with `player == null`, which
 * MatchZy's own admin check — `IsPlayerAdmin` in `Utility.cs` — treats as admin, so no separate
 * MatchZy admin config is needed for these). Callers should invoke this *after* their own DB
 * transaction commits and treat failures as non-fatal, same as `pushMatchConfigToServer`.
 */
export async function pushRconCommand(matchId: number, command: string): Promise<void> {
	const server = await resolveMatchServer(matchId);
	await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute(command));
}

/**
 * Pushes a match's config (teams/players/maps/connect password) to whichever real CS2 server in
 * the pool it was assigned to (see `ensureGameServer` / `src/lib/cs2/server-pool.ts`), over RCON,
 * via MatchZy's `matchzy_loadmatch_url` (the server does an authenticated GET back to
 * `GET /api/matches/[matchId]/game-server/match-config`). Also sets `sv_password` directly, as
 * a belt-and-suspenders measure alongside the `cvars.sv_password` in that same config, since it
 * should take effect immediately regardless of `cvars` restore timing.
 *
 * Callers should invoke this *after* their own DB transaction commits — RCON is a network side
 * effect and must not run inside a transaction that could still roll back — and treat failures
 * as non-fatal (log and surface a warning; the match can still be marked LIVE in the app while
 * an organizer retries manually).
 */
export async function pushMatchConfigToServer(matchId: number): Promise<void> {
	const appBaseUrl = process.env.NEXTAUTH_URL;
	const gameServerToken = process.env.GAME_SERVER_TOKEN;
	if (!appBaseUrl || !gameServerToken) {
		throw new Error('NEXTAUTH_URL and GAME_SERVER_TOKEN must both be configured to push match config to the game server');
	}

	const gameServer = await db.gameServer.findUniqueOrThrow({ where: { matchId } });
	const server = findServerByConnect(gameServer.connectIp, gameServer.port);
	if (!server) {
		throw new Error(`No CS2_SERVER_POOL entry matches this match's assigned server (${gameServer.connectIp}:${gameServer.port}) — was the pool config changed after the match started?`);
	}

	const configUrl = `${appBaseUrl}/api/matches/${matchId}/game-server/match-config`;

	await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
		await rcon.execute(`matchzy_loadmatch_url "${configUrl}" x-game-server-token ${gameServerToken}`);
		await rcon.execute(`sv_password ${gameServer.password}`);
	});

	await db.gameServer.update({ where: { matchId }, data: { matchConfigLoadedAt: new Date() } });
}
