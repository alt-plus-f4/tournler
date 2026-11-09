/**
 * Tournler CS2 host agent.
 *
 * Runs on a game host (Linux, as root) and lets the Tournler app create, start, stop and remove
 * CS2 dedicated server containers over a small signed HTTP API — so adding a server is a button
 * in Admin → Servers instead of editing compose files.
 *
 * Disk: every server shares ONE read-only copy of the ~50 GB CS2 install (`<data>/base`) through
 * an overlayfs mount; each server only stores what it changes (config, plugins, logs, demos —
 * usually a few hundred MB). `SHARE_MODE=copy` falls back to a full copy per server for hosts
 * without overlayfs.
 *
 * Plain Node, no dependencies: `node agent.ts` (Node 22.18+ / 24 strips the types itself).
 * Config comes from the environment — see agent.env.example and README.md.
 */
import http from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs, statfsSync, existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

// ---------------------------------------------------------------------------------------------
// Request signing — identical to src/lib/cs2/agent-signature.ts in the app (a test keeps them equal).
// ---------------------------------------------------------------------------------------------

export const MAX_SKEW_MS = 60_000;

export function sign(secret: string, req: { method: string; path: string; body: string; timestamp: number }): string {
	const bodyHash = createHash('sha256').update(req.body).digest('hex');
	return createHmac('sha256', secret).update(`${req.timestamp}.${req.method.toUpperCase()}.${req.path}.${bodyHash}`).digest('hex');
}

export function verify(secret: string, req: { method: string; path: string; body: string; timestamp: number; signature: string }, now = Date.now()): boolean {
	if (!Number.isFinite(req.timestamp) || Math.abs(now - req.timestamp) > MAX_SKEW_MS) return false;
	const expected = Buffer.from(sign(secret, req), 'hex');
	const given = Buffer.from(req.signature, 'hex');
	return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---------------------------------------------------------------------------------------------
// Types and validation
// ---------------------------------------------------------------------------------------------

export interface ServerSpec {
	slug: string;
	name: string;
	gamePort: number;
	rconPort: number;
	tvPort: number;
	gamePassword: string;
	rconPassword: string;
	tvPassword: string;
	startMap: string;
}

export interface StoredSpec extends ServerSpec {
	desired: 'running' | 'stopped';
	tokenIndex: number | null;
	/** CPU core this server is pinned to (from CPU_LIST); null when pinning is off. */
	cpu?: number | null;
}

export interface AgentConfig {
	secret: string;
	dataDir: string;
	settingsDir: string;
	image: string;
	tokens: string[];
	mode: 'overlay' | 'copy';
	customCssDir: string | null;
	steamcmdPath: string;
	/** `host` skips Docker's NAT for UDP (lower latency); `bridge` publishes ports with -p. */
	networkMode: 'host' | 'bridge';
	/** Cores servers may be pinned to, one each. Empty = no pinning. */
	cpus: number[];
}

export class HttpError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SAFE_SECRET = /^[A-Za-z0-9_.~-]{1,128}$/;
const MAP = /^[A-Za-z0-9_]{1,40}$/;

function int(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1024 || value > 65535) throw new HttpError(400, `${field} must be a port from 1024 to 65535`);
	return value;
}

function str(value: unknown, field: string, pattern: RegExp): string {
	if (typeof value !== 'string' || !pattern.test(value)) throw new HttpError(400, `${field} is invalid`);
	return value;
}

/** Everything that ends up in a container argument is checked here; nothing is ever passed through a shell. */
export function validateSpec(raw: unknown): ServerSpec {
	if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Body must be a JSON object');
	const r = raw as Record<string, unknown>;
	const name = r.name;
	// eslint-disable-next-line no-control-regex
	if (typeof name !== 'string' || name.length < 1 || name.length > 80 || /["\\\u0000-\u001f\u007f]/.test(name)) throw new HttpError(400, 'name is invalid');
	const spec: ServerSpec = {
		slug: str(r.slug, 'slug', SLUG),
		name,
		gamePort: int(r.gamePort, 'gamePort'),
		rconPort: int(r.rconPort, 'rconPort'),
		tvPort: int(r.tvPort, 'tvPort'),
		gamePassword: str(r.gamePassword, 'gamePassword', SAFE_SECRET),
		rconPassword: str(r.rconPassword, 'rconPassword', SAFE_SECRET),
		tvPassword: str(r.tvPassword, 'tvPassword', SAFE_SECRET),
		startMap: str(r.startMap, 'startMap', MAP),
	};
	if (new Set([spec.gamePort, spec.rconPort, spec.tvPort]).size !== 3) throw new HttpError(400, 'Game, RCON and GOTV ports must differ');
	return spec;
}

export function containerName(slug: string): string {
	return `cs2-${slug}`;
}

export type Route =
	{ name: 'health' } | { name: 'list' } | { name: 'create' } | { name: 'baseUpdate' } | { name: 'power'; slug: string; action: 'start' | 'stop' | 'restart' } | { name: 'remove'; slug: string };

export function matchRoute(method: string, pathname: string): Route | null {
	const parts = pathname.split('/').filter(Boolean);
	if (method === 'GET' && parts.length === 1 && parts[0] === 'health') return { name: 'health' };
	if (method === 'GET' && parts.length === 1 && parts[0] === 'servers') return { name: 'list' };
	if (method === 'POST' && parts.length === 1 && parts[0] === 'servers') return { name: 'create' };
	if (method === 'POST' && parts.length === 2 && parts[0] === 'base' && parts[1] === 'update') return { name: 'baseUpdate' };
	if (parts[0] === 'servers' && parts.length === 2 && method === 'DELETE' && SLUG.test(parts[1])) return { name: 'remove', slug: parts[1] };
	if (parts[0] === 'servers' && parts.length === 3 && method === 'POST' && SLUG.test(parts[1]) && ['start', 'stop', 'restart'].includes(parts[2])) {
		return { name: 'power', slug: parts[1], action: parts[2] as 'start' | 'stop' | 'restart' };
	}
	return null;
}

/** Docker arguments for one server. `merged` is the directory mounted as the game root. */
export function buildRunArgs(
	spec: ServerSpec,
	cfg: Pick<AgentConfig, 'image' | 'settingsDir' | 'customCssDir'> & Partial<Pick<AgentConfig, 'networkMode'>>,
	token: string | null,
	merged: string,
	cpu: number | null = null,
): string[] {
	const root = '/home/steam/cs2-dedicated';
	const args = [
		'run',
		'-d',
		'-it',
		'--name',
		containerName(spec.slug),
		// No docker restart policy on purpose: after a host reboot the overlay must be mounted
		// BEFORE the container starts (an empty game dir would trigger a 50 GB download), so the
		// agent's own supervisor starts servers once their mounts are back.
		'--restart',
		'no',
		'--label',
		'tournler.managed=true',
		'--label',
		`tournler.slug=${spec.slug}`,
		...(cfg.networkMode === 'host' ? ['--network', 'host'] : []),
		...(cpu !== null ? ['--cpuset-cpus', String(cpu)] : []),
		'-e',
		`CS2_SERVERNAME=${spec.name}`,
		'-e',
		'CS2_LAN=0',
		'-e',
		`CS2_PORT=${spec.gamePort}`,
		'-e',
		`CS2_RCON_PORT=${spec.rconPort}`,
		'-e',
		`CS2_PW=${spec.gamePassword}`,
		'-e',
		`CS2_RCONPW=${spec.rconPassword}`,
		'-e',
		`TV_PORT=${spec.tvPort}`,
		'-e',
		`TV_PW=${spec.tvPassword}`,
		'-e',
		'TV_ENABLE=1',
		'-e',
		`CS2_STARTMAP=${spec.startMap}`,
	];
	if (token) args.push('-e', `SRCDS_TOKEN=${token}`);
	args.push(
		'-v',
		`${merged}:${root}`,
		'-v',
		`${cfg.settingsDir}/pre.sh:${root}/pre.sh`,
		'-v',
		`${cfg.settingsDir}/post.sh:${root}/post.sh`,
		'-v',
		`${cfg.settingsDir}/game/csgo/cfg/MatchZy:${root}/game/csgo/cfg/MatchZy`,
	);
	if (cfg.customCssDir) args.push('-v', `${cfg.customCssDir}:${root}/custom-counterstrikesharp:ro`);
	if (cfg.networkMode !== 'host') {
		args.push(
			'-p',
			`${spec.gamePort}:${spec.gamePort}/tcp`,
			'-p',
			`${spec.rconPort}:${spec.rconPort}/tcp`,
			'-p',
			`${spec.gamePort}:${spec.gamePort}/udp`,
			'-p',
			`${spec.tvPort}:${spec.tvPort}/udp`,
		);
	}
	args.push(cfg.image);
	return args;
}

/** First configured Steam game-server login token no other server uses; Steam ties a token to one running server. */
export function pickToken(tokens: string[], used: (number | null)[]): { index: number; token: string } {
	const taken = new Set(used.filter((i): i is number => i !== null));
	for (let i = 0; i < tokens.length; i++) if (!taken.has(i)) return { index: i, token: tokens[i] };
	throw new HttpError(
		409,
		tokens.length === 0 ? 'No Steam game server login token configured (SRCDS_TOKENS)' : `All ${tokens.length} Steam game server login tokens are in use — add more to SRCDS_TOKENS`,
	);
}

/** Parses a core list like "2-7,9" into sorted unique core numbers. */
export function parseCpuList(raw: string | undefined): number[] {
	if (!raw || !raw.trim()) return [];
	const out = new Set<number>();
	for (const part of raw.split(',')) {
		const m = /^\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*$/.exec(part);
		if (!m) throw new Error(`CPU_LIST has an invalid part: "${part.trim()}" (use e.g. 2-7 or 2,3,4)`);
		const from = Number(m[1]);
		const to = m[2] === undefined ? from : Number(m[2]);
		if (to < from) throw new Error(`CPU_LIST range ${from}-${to} is backwards`);
		for (let c = from; c <= to; c++) out.add(c);
	}
	return [...out].sort((a, b) => a - b);
}

/** First configured core no other server is pinned to. Null when pinning is off. */
export function pickCpu(cpus: number[], used: (number | null | undefined)[]): number | null {
	if (cpus.length === 0) return null;
	const taken = new Set(used.filter((c): c is number => typeof c === 'number'));
	const free = cpus.find((c) => !taken.has(c));
	if (free === undefined) throw new HttpError(409, `All ${cpus.length} CPU cores in CPU_LIST already have a server — add cores or another host`);
	return free;
}

export function findPortConflict(spec: ServerSpec, existing: ServerSpec[]): string | null {
	const wanted = [spec.gamePort, spec.rconPort, spec.tvPort];
	for (const other of existing) {
		if (other.slug === spec.slug) return `A server called ${spec.slug} already exists`;
		const taken = [other.gamePort, other.rconPort, other.tvPort];
		if (wanted.some((p) => taken.includes(p))) return `A port is already used by ${other.slug}`;
	}
	return null;
}

export function loadConfig(env: Record<string, string | undefined>): AgentConfig {
	const secret = env.AGENT_SECRET ?? '';
	if (secret.length < 24) throw new Error('AGENT_SECRET must be set to at least 24 characters');
	const settingsDir = env.SETTINGS_DIR;
	if (!settingsDir) throw new Error('SETTINGS_DIR must point at the cs-docker/settings folder (pre.sh, post.sh, game/csgo/cfg/MatchZy)');
	const tokens = (env.SRCDS_TOKENS ?? env.SRCDS_TOKEN ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
	const mode = env.SHARE_MODE ?? (process.platform === 'linux' ? 'overlay' : 'copy');
	if (mode !== 'overlay' && mode !== 'copy') throw new Error('SHARE_MODE must be overlay or copy');
	const networkMode = env.NETWORK_MODE ?? 'bridge';
	if (networkMode !== 'host' && networkMode !== 'bridge') throw new Error('NETWORK_MODE must be host or bridge');
	return {
		secret,
		dataDir: env.AGENT_DATA_DIR ?? '/srv/cs2',
		settingsDir,
		image: env.CS2_IMAGE ?? 'joedwards32/cs2',
		tokens,
		mode,
		customCssDir: env.CUSTOM_CSS_DIR && existsSync(env.CUSTOM_CSS_DIR) ? env.CUSTOM_CSS_DIR : null,
		steamcmdPath: env.STEAMCMD_PATH ?? '/home/steam/steamcmd/steamcmd.sh',
		networkMode,
		cpus: parseCpuList(env.CPU_LIST),
	};
}

// ---------------------------------------------------------------------------------------------
// Host operations
// ---------------------------------------------------------------------------------------------

// Files are chowned to 1000:1000, the `steam` user inside joedwards32/cs2.
class Agent {
	cfg: AgentConfig;
	baseUpdate: { state: 'idle' | 'running' | 'failed'; startedAt?: string; error?: string } = { state: 'idle' };
	private queue: Promise<unknown> = Promise.resolve();

	constructor(cfg: AgentConfig) {
		this.cfg = cfg;
	}

	/** Serialises operations that change the fleet, so two creates can't pick the same port or token. */
	private exclusive<T>(fn: () => Promise<T>): Promise<T> {
		const next = this.queue.then(fn, fn);
		this.queue = next.catch(() => {});
		return next;
	}

	private dirs(slug: string) {
		const root = path.join(this.cfg.dataDir, 'servers', slug);
		return { root, upper: path.join(root, 'upper'), work: path.join(root, 'work'), merged: path.join(root, 'merged'), spec: path.join(root, 'spec.json') };
	}

	private get base() {
		return path.join(this.cfg.dataDir, 'base');
	}

	baseInstalled(): boolean {
		return existsSync(path.join(this.base, 'game', 'csgo', 'gameinfo.gi')) || existsSync(path.join(this.base, 'game', 'bin', 'linuxsteamrt64', 'cs2'));
	}

	async specs(): Promise<StoredSpec[]> {
		const dir = path.join(this.cfg.dataDir, 'servers');
		let names: string[] = [];
		try {
			names = await fs.readdir(dir);
		} catch {
			return [];
		}
		const out: StoredSpec[] = [];
		for (const name of names) {
			try {
				out.push(JSON.parse(await fs.readFile(this.dirs(name).spec, 'utf8')) as StoredSpec);
			} catch {
				// half-created directory; ignored
			}
		}
		return out;
	}

	/** The container's `steam` user must own what it writes. Only root can chown, so a non-root agent warns instead of failing. */
	private async chownSteam(dir: string): Promise<void> {
		try {
			await fs.chown(dir, 1000, 1000);
		} catch (error) {
			console.warn(`[agent] could not chown ${dir} to 1000:1000 (run the agent as root):`, error instanceof Error ? error.message : error);
		}
	}

	private async docker(...args: string[]): Promise<string> {
		const { stdout } = await run('docker', args, { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
		return stdout.trim();
	}

	async state(slug: string): Promise<string> {
		try {
			return await this.docker('inspect', '-f', '{{.State.Status}}', containerName(slug));
		} catch {
			return 'missing';
		}
	}

	private isMounted(dir: string): boolean {
		try {
			return readFileSync('/proc/mounts', 'utf8')
				.split('\n')
				.some((line) => line.split(' ')[1] === dir);
		} catch {
			return false;
		}
	}

	private async ensureMounted(slug: string): Promise<void> {
		if (this.cfg.mode !== 'overlay') return;
		const d = this.dirs(slug);
		if (this.isMounted(d.merged)) return;
		await fs.mkdir(d.merged, { recursive: true });
		await run('mount', ['-t', 'overlay', 'overlay', '-o', `lowerdir=${this.base},upperdir=${d.upper},workdir=${d.work}`, d.merged]);
	}

	private async unmount(slug: string): Promise<void> {
		if (this.cfg.mode !== 'overlay') return;
		const d = this.dirs(slug);
		if (this.isMounted(d.merged)) await run('umount', [d.merged]);
	}

	async health() {
		let diskFreeGb: number | null = null;
		let diskTotalGb: number | null = null;
		try {
			await fs.mkdir(this.cfg.dataDir, { recursive: true });
			const s = statfsSync(this.cfg.dataDir);
			diskFreeGb = Math.round((s.bavail * s.bsize) / 1e9);
			diskTotalGb = Math.round((s.blocks * s.bsize) / 1e9);
		} catch {
			// statfs unavailable
		}
		return { ok: true, hostname: os.hostname(), mode: this.cfg.mode, networkMode: this.cfg.networkMode, baseInstalled: this.baseInstalled(), baseUpdate: this.baseUpdate, diskFreeGb, diskTotalGb, servers: (await this.specs()).length };
	}

	async list() {
		const specs = await this.specs();
		return { servers: await Promise.all(specs.map(async (s) => ({ slug: s.slug, state: await this.state(s.slug), desired: s.desired, gamePort: s.gamePort }))) };
	}

	create(raw: unknown) {
		const spec = validateSpec(raw);
		return this.exclusive(async () => {
			if (this.baseUpdate.state === 'running') throw new HttpError(409, 'The shared game files are updating — try again when that finishes');
			if (!this.baseInstalled()) throw new HttpError(409, 'The shared game files are not installed yet. Run "Install / update game files" on this host first.');
			const existing = await this.specs();
			const conflict = findPortConflict(spec, existing);
			if (conflict) throw new HttpError(409, conflict);
			const { index, token } = pickToken(
				this.cfg.tokens,
				existing.map((s) => s.tokenIndex),
			);

			const cpu = pickCpu(
				this.cfg.cpus,
				existing.map((s) => s.cpu),
			);

			const d = this.dirs(spec.slug);
			try {
				await fs.mkdir(d.root, { recursive: true });
				if (this.cfg.mode === 'overlay') {
					await fs.mkdir(d.upper, { recursive: true });
					await fs.mkdir(d.work, { recursive: true });
					await this.chownSteam(d.upper);
				}
				await fs.mkdir(d.merged, { recursive: true });
				if (this.cfg.mode === 'copy') {
					// Full private copy (~50 GB) — only for hosts without overlayfs.
					await run('cp', ['-a', `${this.base}/.`, d.merged], { timeout: 3_600_000 });
				} else {
					await this.ensureMounted(spec.slug);
				}
				const stored: StoredSpec = { ...spec, desired: 'running', tokenIndex: index, cpu };
				await fs.writeFile(d.spec, JSON.stringify(stored), { mode: 0o600 });
				await this.docker(...buildRunArgs(spec, this.cfg, token, d.merged, cpu));
			} catch (error) {
				await this.docker('rm', '-f', containerName(spec.slug)).catch(() => {});
				await this.unmount(spec.slug).catch(() => {});
				await fs.rm(d.root, { recursive: true, force: true }).catch(() => {});
				throw error;
			}
			return { slug: spec.slug };
		});
	}

	remove(slug: string) {
		return this.exclusive(async () => {
			const d = this.dirs(slug);
			if (!existsSync(d.spec) && (await this.state(slug)) === 'missing') throw new HttpError(404, 'No such server');
			await this.docker('rm', '-f', containerName(slug)).catch(() => {});
			await this.unmount(slug);
			await fs.rm(d.root, { recursive: true, force: true });
			return { removed: true };
		});
	}

	power(slug: string, action: 'start' | 'stop' | 'restart') {
		return this.exclusive(async () => {
			const spec = (await this.specs()).find((s) => s.slug === slug);
			if (!spec) throw new HttpError(404, 'No such server');
			if (action !== 'start') await this.docker('stop', '-t', '30', containerName(slug)).catch(() => {});
			if (action === 'stop') {
				await this.writeDesired(spec, 'stopped');
				return { state: await this.state(slug) };
			}
			await this.writeDesired(spec, 'running');
			await this.startContainer(spec);
			return { state: await this.state(slug) };
		});
	}

	private async writeDesired(spec: StoredSpec, desired: 'running' | 'stopped') {
		await fs.writeFile(this.dirs(spec.slug).spec, JSON.stringify({ ...spec, desired }), { mode: 0o600 });
	}

	private async startContainer(spec: StoredSpec) {
		await this.ensureMounted(spec.slug);
		const state = await this.state(spec.slug);
		if (state === 'running') return;
		if (state === 'missing') {
			const token = spec.tokenIndex !== null ? (this.cfg.tokens[spec.tokenIndex] ?? null) : null;
			await this.docker(...buildRunArgs(spec, this.cfg, token, this.dirs(spec.slug).merged, spec.cpu ?? null));
		} else {
			await this.docker('start', containerName(spec.slug));
		}
	}

	updateBase() {
		if (this.baseUpdate.state === 'running') throw new HttpError(409, 'An update is already running');
		return this.exclusive(async () => {
			const specs = await this.specs();
			for (const s of specs)
				if ((await this.state(s.slug)) === 'running') throw new HttpError(409, `Stop all servers on this host first (${s.slug} is running) — updating the shared files under a live server breaks it`);
			await fs.mkdir(this.base, { recursive: true });
			await this.chownSteam(this.base);
			this.baseUpdate = { state: 'running', startedAt: new Date().toISOString() };
			// Fire and forget: a first install is ~50 GB. Progress is visible through /health.
			void this.docker(
				'run',
				'--rm',
				'--entrypoint',
				this.cfg.steamcmdPath,
				'-v',
				`${this.base}:/home/steam/cs2-dedicated`,
				this.cfg.image,
				'+force_install_dir',
				'/home/steam/cs2-dedicated',
				'+login',
				'anonymous',
				'+app_update',
				'730',
				'validate',
				'+quit',
			)
				.then(() => {
					this.baseUpdate = { state: 'idle' };
				})
				.catch((error: unknown) => {
					this.baseUpdate = { state: 'failed', startedAt: this.baseUpdate.startedAt, error: error instanceof Error ? error.message.slice(0, 300) : 'update failed' };
				});
			return { started: true };
		});
	}

	/** Brings every server that should be running back up: remounts overlays after a reboot, restarts crashed containers. */
	async reconcile(): Promise<void> {
		if (this.baseUpdate.state === 'running') return;
		for (const spec of await this.specs()) {
			if (spec.desired !== 'running') continue;
			try {
				await this.exclusive(() => this.startContainer(spec));
			} catch (error) {
				console.error(`[agent] could not start ${spec.slug}:`, error instanceof Error ? error.message : error);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------------------------

const MAX_BODY = 16 * 1024;

function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => {
			size += c.length;
			if (size > MAX_BODY) {
				reject(new HttpError(413, 'Body too large'));
				req.destroy();
				return;
			}
			chunks.push(c);
		});
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

export function startServer(cfg: AgentConfig, host: string, port: number): http.Server {
	const agent = new Agent(cfg);
	const server = http.createServer(async (req, res) => {
		const send = (status: number, body: unknown) => {
			res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
			res.end(JSON.stringify(body));
		};
		try {
			const url = new URL(req.url ?? '/', 'http://agent.local');
			const method = req.method ?? 'GET';
			const body = await readBody(req);
			const ok = verify(cfg.secret, {
				method,
				path: url.pathname,
				body,
				timestamp: Number(req.headers['x-agent-timestamp']),
				signature: String(req.headers['x-agent-signature'] ?? ''),
			});
			if (!ok) return send(401, { error: 'Bad signature' });

			const route = matchRoute(method, url.pathname);
			if (!route) return send(404, { error: 'Not found' });
			const json = body ? (JSON.parse(body) as unknown) : undefined;

			switch (route.name) {
				case 'health':
					return send(200, await agent.health());
				case 'list':
					return send(200, await agent.list());
				case 'create':
					return send(201, await agent.create(json));
				case 'baseUpdate':
					return send(202, await agent.updateBase());
				case 'power':
					return send(200, await agent.power(route.slug, route.action));
				case 'remove':
					return send(200, await agent.remove(route.slug));
			}
		} catch (error) {
			if (error instanceof HttpError) return send(error.status, { error: error.message });
			if (error instanceof SyntaxError) return send(400, { error: 'Body is not valid JSON' });
			console.error('[agent] request failed:', error instanceof Error ? error.message : error);
			send(500, { error: 'Agent error' });
		}
	});
	server.listen(port, host, () => console.log(`[agent] listening on ${host}:${port}, data in ${cfg.dataDir}, mode ${cfg.mode}`));
	void agent.reconcile();
	setInterval(() => void agent.reconcile(), 30_000).unref();
	return server;
}

// Run as a program (`node agent.ts`), but stay importable for the unit tests.
if (process.argv[1] && /agent\.(ts|js)$/.test(process.argv[1]) && !process.env.JEST_WORKER_ID) {
	startServer(loadConfig(process.env), process.env.AGENT_HOST ?? '127.0.0.1', Number(process.env.AGENT_PORT ?? 8787));
}
