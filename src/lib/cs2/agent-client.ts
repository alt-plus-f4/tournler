import 'server-only';
import { AGENT_SIGNATURE_HEADER, AGENT_TIMESTAMP_HEADER, signAgentRequest } from './agent-signature';

/** What the host agent needs to know to create one CS2 container. */
export interface AgentServerSpec {
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

export interface AgentHealth {
	ok: boolean;
	hostname: string;
	mode: 'overlay' | 'copy';
	baseInstalled: boolean;
	baseUpdate: { state: 'idle' | 'running' | 'failed'; startedAt?: string; error?: string };
	diskFreeGb: number | null;
	diskTotalGb: number | null;
	servers: number;
}

export interface AgentServerInfo {
	slug: string;
	/** Docker state: running, exited, … or `missing` when only the spec exists. */
	state: string;
	desired: 'running' | 'stopped';
	gamePort: number;
}

export type AgentTarget = { agentUrl: string; secret: string };
export type PowerAction = 'start' | 'stop' | 'restart';

export class AgentError extends Error {
	constructor(
		message: string,
		readonly status: number | null,
	) {
		super(message);
		this.name = 'AgentError';
	}
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function call<T>(target: AgentTarget, method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
	const payload = body === undefined ? '' : JSON.stringify(body);
	const timestamp = Date.now();
	const url = new URL(path, target.agentUrl.endsWith('/') ? target.agentUrl : `${target.agentUrl}/`);
	const signedPath = url.pathname;

	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers: {
				'content-type': 'application/json',
				[AGENT_TIMESTAMP_HEADER]: String(timestamp),
				[AGENT_SIGNATURE_HEADER]: signAgentRequest(target.secret, { method, path: signedPath, body: payload, timestamp }),
			},
			body: payload || undefined,
			signal: AbortSignal.timeout(timeoutMs),
			redirect: 'error',
			cache: 'no-store',
		});
	} catch (error) {
		throw new AgentError(error instanceof Error && error.name === 'TimeoutError' ? 'Host agent timed out' : 'Host agent is unreachable', null);
	}

	const text = await res.text();
	let json: unknown = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {
		// non-JSON error body from a proxy
	}
	if (!res.ok) {
		const message = json && typeof json === 'object' && 'error' in json && typeof json.error === 'string' ? json.error : `Host agent returned ${res.status}`;
		throw new AgentError(message, res.status);
	}
	return json as T;
}

export const agentClient = {
	health: (t: AgentTarget) => call<AgentHealth>(t, 'GET', '/health', undefined, 6_000),
	list: (t: AgentTarget) => call<{ servers: AgentServerInfo[] }>(t, 'GET', '/servers', undefined, 10_000),
	// Creating mounts the shared install and starts a container; a copy-mode host can take minutes.
	create: (t: AgentTarget, spec: AgentServerSpec) => call<{ slug: string }>(t, 'POST', '/servers', spec, 120_000),
	remove: (t: AgentTarget, slug: string) => call<{ removed: boolean }>(t, 'DELETE', `/servers/${encodeURIComponent(slug)}`, undefined, 60_000),
	power: (t: AgentTarget, slug: string, action: PowerAction) => call<{ state: string }>(t, 'POST', `/servers/${encodeURIComponent(slug)}/${action}`, undefined, 60_000),
	updateBase: (t: AgentTarget) => call<{ started: boolean }>(t, 'POST', '/base/update', undefined, 10_000),
};
