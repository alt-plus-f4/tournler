import { randomBytes } from 'crypto';
import type Rcon from 'rcon-srcds';
import { db } from '@/lib/db';
import { withRcon } from './rcon-client';
import { findServerByConnect, Cs2ServerConfig } from './server-pool';
import { gameServerCallbackUrl } from './callback-url';
import { buildMatchConfig } from './match-config';
import { assertMatchHostsGameServer } from '@/lib/tournaments/game-rules';

const POOL_CONTROLLER_RESTART_TIMEOUT_MS = 120_000;
const POOL_CONTROLLER_POLL_INTERVAL_MS = 3_000;
// Each individual poll attempt's own ceiling — separate from the overall deadline above. Without
// this, a single attempt that hangs (rather than cleanly failing) — e.g. a TCP connect stuck
// waiting on the OS's own multi-minute default connection timeout, observed directly: a restart
// that should have failed at the 120s deadline instead returned success after 5+ minutes because
// the very first poll attempt's connection just never resolved either way until the container
// happened to become reachable — silently defeats the deadline above, since the deadline is only
// ever checked in between attempts, never during one.
const POOL_CONTROLLER_POLL_ATTEMPT_TIMEOUT_MS = 4_000;

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
			}
		);
	});
}

/**
 * Recreates `server`'s CS2 container booted directly onto `startMap` (via `pool-controller`) and
 * waits for RCON to answer again before returning — the only reliable way to get a match onto its
 * first map, since a live RCON `changelevel`/`map` command segfaults this Metamod build 100% of
 * the time regardless of plugins loaded (confirmed directly: bare `changelevel <map>` over RCON
 * with CounterStrikeSharp fully unloaded still crashes it). A server that *boots* already on the
 * target map never goes through that code path — MatchZy's own match-load only calls changelevel
 * when the current map doesn't already match the requested one.
 *
 * This only matters for a match's *first* map: pickups (the only kind of match currently
 * exercised end-to-end — see cs-docker/README.md) are always single-map, so this is the only
 * transition they ever need. A multi-map series' own map 2/3 transition is still MatchZy's
 * internal changelevel and would still hit this same crash — that's a separate, unresolved gap
 * for non-pickup matches, not something this function addresses.
 */
async function restartServerOntoMap(server: Cs2ServerConfig, startMap: string): Promise<void> {
	const controllerUrl = process.env.POOL_CONTROLLER_URL;
	const controllerToken = process.env.POOL_CONTROLLER_TOKEN;
	if (!controllerUrl || !controllerToken) {
		throw new Error('POOL_CONTROLLER_URL and POOL_CONTROLLER_TOKEN must both be configured to start a match (see cs-docker/pool-controller/index.js) — a live in-process map change is not safe on this stack.');
	}

	// docker-controller's own `docker compose up -d --force-recreate` normally returns in seconds
	// (it doesn't wait for the container's own boot to finish), but abort rather than hang the
	// whole match-start request indefinitely if it somehow doesn't.
	const controllerAbort = new AbortController();
	const controllerTimer = setTimeout(() => controllerAbort.abort(), POOL_CONTROLLER_RESTART_TIMEOUT_MS);
	let response: Response;
	try {
		response = await fetch(`${controllerUrl}/restart`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-pool-controller-token': controllerToken },
			body: JSON.stringify({ containerName: server.containerName, startMapEnvVar: server.startMapEnvVar, startMap }),
			signal: controllerAbort.signal,
		});
	} finally {
		clearTimeout(controllerTimer);
	}
	if (!response.ok) {
		throw new Error(`pool-controller restart of ${server.containerName} onto ${startMap} failed: ${response.status} ${await response.text().catch(() => '')}`);
	}

	const deadline = Date.now() + POOL_CONTROLLER_RESTART_TIMEOUT_MS;
	for (;;) {
		try {
			await withTimeout(
				withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, (rcon) => rcon.execute('status')),
				POOL_CONTROLLER_POLL_ATTEMPT_TIMEOUT_MS,
				`RCON attempt to ${server.containerName} took too long`
			);
			return;
		} catch (error) {
			if (Date.now() >= deadline) {
				throw new Error(`${server.containerName} never came back up on RCON after restarting onto ${startMap} (waited ${POOL_CONTROLLER_RESTART_TIMEOUT_MS}ms): ${error instanceof Error ? error.message : error}`);
			}
			await new Promise((resolve) => setTimeout(resolve, POOL_CONTROLLER_POLL_INTERVAL_MS));
		}
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

	const gameServer = await db.gameServer.findUniqueOrThrow({ where: { matchId } });
	const server = findServerByConnect(gameServer.connectIp, gameServer.port);
	if (!server) {
		throw new Error(`No CS2_SERVER_POOL entry matches this match's assigned server (${gameServer.connectIp}:${gameServer.port}) — was the pool config changed after the match started?`);
	}

	// The `bots` flag rides on the URL the server fetches (see buildMatchConfig's bots option),
	// not the RCON command itself — the server calls this URL asynchronously after the RCON push.
	const configUrl = `${appBaseUrl}/api/matches/${matchId}/game-server/match-config${options.bots ? '?bots=1' : ''}`;

	// This pool is fixed-size and reused across matches (see server-pool.ts) — a server freed by a
	// COMPLETED match still has that old match loaded in MatchZy's own memory until something tells
	// it otherwise, so simply loading a new match's config on top isn't enough of a clean slate on
	// its own. `matchConfigLoadedAt` being unset means this is the *first* push for this match on
	// this GameServer row — the one moment that needs a full container restart onto this match's
	// first map (see restartServerOntoMap) rather than just an RCON push, since a server that's
	// already mid-match (or idling on some other map) can only get onto this one via a live
	// changelevel, which crashes. A subsequent re-push for the *same* match (the manual "Re-sync
	// match config" retry) must not restart the container — that would kick everyone and wipe the
	// match's own live progress instead of just refreshing its config — and doesn't need to, since
	// the server is already sitting on this match's map.
	const isFirstPushForThisMatch = gameServer.matchConfigLoadedAt === null;

	if (isFirstPushForThisMatch) {
		const { maplist } = await buildMatchConfig(matchId, options);
		await restartServerOntoMap(server, maplist[0]);
	}

	await withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
		await rcon.execute(`matchzy_loadmatch_url "${configUrl}" x-game-server-token ${gameServerToken}`);
		await rcon.execute(`sv_password ${gameServer.password}`);
	});

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
