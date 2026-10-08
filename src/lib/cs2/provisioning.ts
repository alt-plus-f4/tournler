import { randomBytes } from 'crypto';
import type Rcon from 'rcon-srcds';
import { db } from '@/lib/db';
import { withRcon } from './rcon-client';
import { findServerByConnect, Cs2ServerConfig } from './server-pool';
import { gameServerCallbackUrl } from './callback-url';
import { buildMatchConfig } from './match-config';
import { statusShowsMap } from './server-status';
import { assertMatchHostsGameServer } from '@/lib/tournaments/game-rules';

// How long a loaded match gets to bring its server onto the match's first map (MatchZy runs the
// changelevel itself once the config is fetched), and how often/how patiently to ask.
const MAP_CHANGE_TIMEOUT_MS = 40_000;
const MAP_POLL_INTERVAL_MS = 2_000;
// Each probe has its own ceiling: a TCP connect to a server mid-changelevel can hang far past the
// overall deadline, which is only ever checked between attempts.
const MAP_POLL_ATTEMPT_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

/**
 * Polls `status` over RCON until `server` reports `map` as loaded, tolerating the server being
 * briefly unreachable while it changes level. Throws if it never gets there within the deadline.
 */
async function waitForServerOnMap(server: Cs2ServerConfig, map: string): Promise<void> {
	const deadline = Date.now() + MAP_CHANGE_TIMEOUT_MS;
	let lastError: unknown = null;
	for (;;) {
		try {
			const status = await withTimeout(
				withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute('status')),
				MAP_POLL_ATTEMPT_TIMEOUT_MS,
				`RCON status probe to ${server.id} took too long`,
			);
			if (typeof status === 'string' && statusShowsMap(status, map)) return;
			lastError = null;
		} catch (error) {
			lastError = error;
		}
		if (Date.now() >= deadline) {
			throw new Error(
				`Server ${server.id} did not reach ${map} within ${MAP_CHANGE_TIMEOUT_MS / 1000}s${lastError instanceof Error ? ` (last error: ${lastError.message})` : ''}. ` +
					`If the server log says "Connection refused" fetching the match config, the server cannot reach this app at GAME_SERVER_CALLBACK_URL (inside Docker, localhost is the container itself — use http://host.docker.internal:3000).`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, MAP_POLL_INTERVAL_MS));
	}
}

/**
 * Kicks every connected human from a live RCON session, by parsing `status`'s player table —
 * there is no plain `kickall` command on a real CS2 server (confirmed directly: `Unknown command
 * 'kickall'!`; CS:GO/Source 1 had one, CS2 doesn't). Confirmed against this server's actual
 * `status` output, human and bot rows alike:
 *   "   3    02:21    0    0     active 786432 172.18.0.1:41373 'p.asenov'"   (human)
 *   "   0      BOT    0    0     active      0 '[Tournler] ... CSTV'"        (bot)
 * — id, then either a connect-duration or the literal "BOT", then ping/loss/state/rate, an
 * optional address (humans only), and the quoted name. `kickid` (unlike `kickall`) is a real,
 * base-engine command. Best-effort: an unrecognized row shape just isn't matched, never thrown.
 */
async function kickAllHumans(rcon: Rcon): Promise<void> {
	const response = await rcon.execute('status');
	const statusOutput = typeof response === 'string' ? response : '';
	const rowPattern = /^\s*(\d+)\s+(BOT|[\d:]+)\s+\d+\s+\d+\s+\w+\s+\d+(?:\s+[\d.]+:\d+)?\s+'.*'/gm;

	let match: RegExpExecArray | null;
	while ((match = rowPattern.exec(statusOutput))) {
		const [, userId, timeOrBot] = match;
		if (timeOrBot === 'BOT') continue;
		await rcon.execute(`kickid ${userId} "Match ended"`);
	}
}

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
	await assertMatchHostsGameServer(db, matchId, 'send RCON commands to');
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
export async function pushMatchConfigToServer(matchId: number, options: { bots?: boolean } = {}): Promise<void> {
	await assertMatchHostsGameServer(db, matchId, 'load a MatchZy config onto');
	const appBaseUrl = gameServerCallbackUrl();
	const gameServerToken = process.env.GAME_SERVER_TOKEN;
	if (!appBaseUrl || !gameServerToken) {
		throw new Error('GAME_SERVER_CALLBACK_URL (or NEXTAUTH_URL) and GAME_SERVER_TOKEN must both be configured to push match config to the game server');
	}

	const gameServer = await db.gameServer.findUniqueOrThrow({ where: { matchId }, include: { match: { select: { status: true } } } });
	// A COMPLETED match's slot is free for the pool to hand to the next match; pushing the old
	// match's config (and sv_password) onto it now would hijack that match's server.
	if (gameServer.match.status === 'COMPLETED') {
		throw new Error(`Match ${matchId} is completed — its server is no longer reserved for it`);
	}
	const server = findServerByConnect(gameServer.connectIp, gameServer.port);
	if (!server) {
		throw new Error(`No CS2_SERVER_POOL entry matches this match's assigned server (${gameServer.connectIp}:${gameServer.port}) — was the pool config changed after the match started?`);
	}

	// The `bots` flag rides on the URL the server fetches (see buildMatchConfig's bots option),
	// not the RCON command itself — the server calls this URL asynchronously after the RCON push.
	const configUrl = `${appBaseUrl}/api/matches/${matchId}/game-server/match-config${options.bots ? '?bots=1' : ''}`;

	// Every map change goes through MatchZy's own changelevel — the server stays up between matches
	// and maps; only its loaded config and map change. The first map has to be confirmed (a veto
	// still in progress would otherwise send the server to a default map).
	const { maplist } = await buildMatchConfig(matchId, { ...options, requireConfirmedMaps: true });

	await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
		await rcon.execute(`matchzy_loadmatch_url "${configUrl}" x-game-server-token ${gameServerToken}`);
		await rcon.execute(`sv_password ${gameServer.password}`);
	});

	await waitForServerOnMap(server, maplist[0]);

	await db.gameServer.update({ where: { matchId }, data: { matchConfigLoadedAt: new Date() } });
}

/**
 * Forcibly clears a match's assigned server the instant the match completes: kicks every
 * connected player and rotates `sv_password` so the old connect string stops working, then tells
 * MatchZy to drop whatever it still has loaded (`css_endmatch`) so score/round state doesn't
 * linger into whatever gets loaded on this server next.
 *
 * `kickid`/`sv_password` are base Source-engine commands, not MatchZy-specific — so the "nobody
 * can stay connected or reconnect" guarantee here doesn't depend on a MatchZy behavior
 * (`css_endmatch`, or its own `matchzy_kick_when_no_match_loaded`) actually working as documented
 * in this specific deployment. `css_endmatch` is still sent for MatchZy's own internal cleanup,
 * but failing to run it doesn't stop the disconnect/lock from taking effect.
 *
 * Callers should invoke this *after* their own DB transaction commits, only once a match has
 * actually just transitioned to COMPLETED (not on a repeat/idempotent call), and treat failure as
 * non-fatal — same convention as `pushMatchConfigToServer`.
 */
export async function releaseGameServerAfterMatch(matchId: number): Promise<void> {
	await assertMatchHostsGameServer(db, matchId, 'release');
	const server = await resolveMatchServer(matchId);
	const throwawayPassword = randomBytes(9).toString('base64url');

	await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
		await kickAllHumans(rcon);
		await rcon.execute(`sv_password ${throwawayPassword}`);
		await rcon.execute('css_endmatch').catch(() => {});
	});
}
