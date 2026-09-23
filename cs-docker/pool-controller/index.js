#!/usr/bin/env node
'use strict';

/**
 * Tiny control-plane sidecar for the CS2 server pool, run directly on the pool's host (not
 * containerized — it needs the `docker compose` CLI and this directory as its cwd either way, so
 * there's nothing gained by wrapping it in another container).
 *
 * Why this exists: MatchZy/CounterStrikeSharp loading a match config normally does an in-process
 * `changelevel` to the match's first map if the server isn't already sitting on it — but on this
 * Metamod build, ANY live `changelevel` (confirmed with a bare `changelevel`/`map` RCON command,
 * zero plugins loaded) segfaults the CS2 process outright. This is a long-standing, still-open
 * upstream bug (see cs-docker/README.md's compatibility section), not something fixable from
 * plugin config. The only reliable way to get a match onto its first map is to have the *process*
 * boot directly onto it (`+map <name>` at launch, via the `CS2_STARTMAP` env var the joedwards32/
 * cs2 image already supports) — never a live transition. Confirmed directly: loading a match
 * whose first map matches an already-booted server's current map does NOT trigger a changelevel
 * (MatchZy skips it) and does not crash; loading one that doesn't match, does.
 *
 * The Tournler app (`src/lib/cs2/provisioning.ts`) calls `POST /restart` here before ever pushing
 * a match's config to a server for the first time, so the server is always freshly booted on the
 * right map first. Authenticated with a shared secret (`POOL_CONTROLLER_TOKEN`) distinct from the
 * RCON passwords and `GAME_SERVER_TOKEN`, since this endpoint can trigger arbitrary container
 * recreation on the host — treat it with the same care as a Docker socket, and never expose this
 * port to the public internet (bind it to a private network / VPN / SSH tunnel only).
 */

const http = require('http');
const { execFile } = require('child_process');

const PORT = Number.parseInt(process.env.POOL_CONTROLLER_PORT || '9800', 10);
const TOKEN = process.env.POOL_CONTROLLER_TOKEN;
const COMPOSE_DIR = process.env.POOL_CONTROLLER_COMPOSE_DIR || __dirname + '/..';

if (!TOKEN) {
	console.error('POOL_CONTROLLER_TOKEN must be set — refusing to start unauthenticated.');
	process.exit(1);
}

// Only ever container names this compose file actually defines — never build a container name
// from request input, even after regex validation, since docker-compose service names are the
// real access-control boundary here (an attacker-chosen-but-regex-valid name could still target
// something outside this stack if we ever run alongside other compose projects on the same host).
const ALLOWED_CONTAINERS = new Set(['cs2-dedicated-01', 'cs2-dedicated-02']);
// Map names are always lowercase ascii + digits/underscore (workshop IDs too, if ever used as
// `startMap`) — reject anything else outright rather than trying to shell-escape it.
const MAP_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;
const ENV_VAR_NAME_PATTERN = /^CS2_SERVER_\d+_STARTMAP$/;

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', (chunk) => {
			data += chunk;
			if (data.length > 10_000) req.destroy(new Error('Request body too large'));
		});
		req.on('end', () => {
			try {
				resolve(data ? JSON.parse(data) : {});
			} catch {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', reject);
	});
}

function restartContainer(containerName, startMapEnvVar, startMap) {
	return new Promise((resolve, reject) => {
		execFile(
			'docker',
			['compose', 'up', '-d', '--force-recreate', containerName],
			{ cwd: COMPOSE_DIR, env: { ...process.env, [startMapEnvVar]: startMap }, timeout: 60_000 },
			(error, stdout, stderr) => {
				if (error) return reject(new Error(stderr || error.message));
				resolve(stdout);
			}
		);
	});
}

const server = http.createServer(async (req, res) => {
	if (req.method !== 'POST' || req.url !== '/restart') {
		res.writeHead(404).end();
		return;
	}

	if (req.headers['x-pool-controller-token'] !== TOKEN) {
		res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid token' }));
		return;
	}

	try {
		const body = await readJsonBody(req);
		const { containerName, startMapEnvVar, startMap } = body;

		if (!ALLOWED_CONTAINERS.has(containerName)) {
			res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Unknown containerName' }));
			return;
		}
		if (typeof startMapEnvVar !== 'string' || !ENV_VAR_NAME_PATTERN.test(startMapEnvVar)) {
			res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid startMapEnvVar' }));
			return;
		}
		if (typeof startMap !== 'string' || !MAP_NAME_PATTERN.test(startMap)) {
			res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid startMap' }));
			return;
		}

		console.log(`[pool-controller] Restarting ${containerName} onto ${startMap} (${startMapEnvVar})`);
		await restartContainer(containerName, startMapEnvVar, startMap);
		res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }));
	} catch (error) {
		console.error('[pool-controller] restart failed:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }));
	}
});

server.listen(PORT, () => {
	console.log(`[pool-controller] listening on :${PORT}, compose dir: ${COMPOSE_DIR}`);
});
