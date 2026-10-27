import { withRcon, type RconTarget } from './rcon-client';
import { describeRconError, parseServerStatus, type ParsedServerStatus } from './parse-status';
import { isWriteOnly, parseCvarValue, SETTING_DEFINITIONS } from './server-settings';
import { getServerPool, type Cs2ServerConfig } from './server-pool';

export const STATUS_TIMEOUT_MS = 4000;
export const STATUS_CACHE_TTL_MS = 5000;

export interface LiveStatus extends ParsedServerStatus {
	online: boolean;
	/** Short failure reason when offline, otherwise null. */
	reason: string | null;
	latencyMs: number | null;
	checkedAt: string;
}

export interface LiveStatusResult {
	live: LiveStatus;
	/** Raw `status` output with secrets removed; null when offline. */
	raw: string | null;
}

const EMPTY_PARSED: ParsedServerStatus = { hostname: null, version: null, map: null, humans: null, bots: null, maxPlayers: null, hibernating: false };

/** Removes every pool RCON password from text that is about to leave the server. */
export function redactSecrets(text: string): string {
	let out = text;
	try {
		for (const s of getServerPool()) {
			if (s.rconPassword && s.rconPassword.length >= 4) out = out.split(s.rconPassword).join('[redacted]');
		}
	} catch {
		// pool unreadable: nothing to redact against
	}
	return out;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('timed out')), ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			},
		);
	});
}

/** One RCON `status` check against an arbitrary target; callers are responsible for vetting the host. */
export async function probeTarget(target: RconTarget): Promise<LiveStatusResult> {
	const started = Date.now();
	try {
		const output = await withTimeout(
			withRcon(target, (rcon) => rcon.execute('status')),
			STATUS_TIMEOUT_MS,
		);
		const raw = redactSecrets(String(output ?? '')).split(target.password).join('[redacted]');
		return { live: { ...parseServerStatus(raw), online: true, reason: null, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() }, raw };
	} catch (error) {
		return { live: { ...EMPTY_PARSED, online: false, reason: describeRconError(error), latencyMs: null, checkedAt: new Date().toISOString() }, raw: null };
	}
}

const cache = new Map<string, { at: number; result: Promise<LiveStatusResult> }>();

/**
 * Live status of one pool server via RCON `status`. Results (including failures) are cached for a
 * few seconds and concurrent callers share one in-flight probe, so several admins refreshing the
 * page never multiply the RCON traffic.
 */
export function getLiveStatus(server: Cs2ServerConfig, options: { fresh?: boolean } = {}): Promise<LiveStatusResult> {
	const now = Date.now();
	const hit = cache.get(server.id);
	if (!options.fresh && hit && now - hit.at < STATUS_CACHE_TTL_MS) return hit.result;
	const result = probeTarget({ host: server.rconHost, port: server.rconPort, password: server.rconPassword });
	cache.set(server.id, { at: now, result });
	return result;
}

export function clearLiveStatusCache(): void {
	cache.clear();
}

/** Reads every allowlisted, readable cvar in one RCON session. Password cvars are never queried. */
export async function readSettingValues(server: { rconHost: string; rconPort: number; rconPassword: string }): Promise<Record<string, string | null> | null> {
	try {
		return await withTimeout(
			withRcon({ host: server.rconHost, port: server.rconPort, password: server.rconPassword }, async (rcon) => {
				const values: Record<string, string | null> = {};
				for (const def of SETTING_DEFINITIONS) {
					if (isWriteOnly(def)) continue;
					values[def.name] = parseCvarValue(redactSecrets(String(await rcon.execute(def.name))), def.name);
				}
				return values;
			}),
			STATUS_TIMEOUT_MS * 3,
		);
	} catch {
		return null;
	}
}
