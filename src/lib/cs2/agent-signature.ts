import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Request signing shared by the app (`agent-client.ts`) and the host agent
 * (`cs-docker/agent/agent.ts`, which carries an identical copy because it runs on the game host
 * without this repo — `agent-signature.test.ts` asserts the two produce the same signature).
 *
 * signature = HMAC-SHA256(secret, `${timestamp}.${METHOD}.${path}.${sha256(body)}`), hex.
 * Requests older (or newer) than `MAX_SKEW_MS` are rejected, which bounds replay of a captured request.
 */

export const AGENT_TIMESTAMP_HEADER = 'x-agent-timestamp';
export const AGENT_SIGNATURE_HEADER = 'x-agent-signature';
export const MAX_SKEW_MS = 60_000;

export function signAgentRequest(secret: string, req: { method: string; path: string; body: string; timestamp: number }): string {
	const bodyHash = createHash('sha256').update(req.body).digest('hex');
	return createHmac('sha256', secret).update(`${req.timestamp}.${req.method.toUpperCase()}.${req.path}.${bodyHash}`).digest('hex');
}

export function verifyAgentRequest(secret: string, req: { method: string; path: string; body: string; timestamp: number; signature: string }, now = Date.now()): boolean {
	if (!Number.isFinite(req.timestamp) || Math.abs(now - req.timestamp) > MAX_SKEW_MS) return false;
	const expected = Buffer.from(signAgentRequest(secret, req), 'hex');
	let given: Buffer;
	try {
		given = Buffer.from(req.signature, 'hex');
	} catch {
		return false;
	}
	return expected.length === given.length && timingSafeEqual(expected, given);
}
