import { createHash, createPrivateKey, createPublicKey, createSign, type KeyObject } from 'crypto';

/**
 * Convex identity for Tournler users. Convex has no view of NextAuth sessions, so the app signs a
 * short-lived RS256 JWT (sub = user id) that Convex verifies against the matching public key
 * (convex/auth.config.ts). The app's own server signs with SERVER_SUBJECT to create notifications,
 * which clients can no longer do. Generate the key pair with `node scripts/generate-convex-auth-key.mjs`.
 */
export const CONVEX_AUTH_ISSUER = 'tournler';
export const CONVEX_AUTH_AUDIENCE = 'convex';
export const SERVER_SUBJECT = 'tournler-server';

let cachedKey: KeyObject | null = null;

function privateKey() {
	if (cachedKey) return cachedKey;
	const pem = process.env.CONVEX_AUTH_PRIVATE_KEY;
	if (!pem) throw new Error('CONVEX_AUTH_PRIVATE_KEY is not set');
	// Env UIs often store multi-line PEMs with literal "\n" — restore real newlines.
	cachedKey = createPrivateKey(pem.replace(/\\n/g, '\n'));
	return cachedKey;
}

/** RFC 7638 thumbprint, so the token's `kid` matches the JWKS entry the key script prints. */
export function keyId(key: KeyObject) {
	const jwk = createPublicKey(key).export({ format: 'jwk' });
	return createHash('sha256').update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n })).digest('base64url');
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function signConvexToken(subject: string, ttlSeconds = 600) {
	const key = privateKey();
	const now = Math.floor(Date.now() / 1000);
	const header = encode({ alg: 'RS256', typ: 'JWT', kid: keyId(key) });
	const payload = encode({ iss: CONVEX_AUTH_ISSUER, aud: CONVEX_AUTH_AUDIENCE, sub: subject, iat: now, exp: now + ttlSeconds });
	const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key).toString('base64url');
	return { token: `${header}.${payload}.${signature}`, expiresAt: (now + ttlSeconds) * 1000 };
}
