import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Seals the secrets stored in the server registry (RCON passwords, host-agent signing keys) with
 * AES-256-GCM, so a database dump alone does not hand out control of every game server. The key
 * is the one server-related secret that stays in the environment: `SERVER_SECRET_KEY`.
 *
 * Format: `v1:<iv>:<tag>:<ciphertext>` (all base64url). Rotating the key means re-saving each
 * server's password; there is no automatic re-encryption.
 */

const PREFIX = 'v1';
const MIN_KEY_LENGTH = 32;

function getKey(): Buffer {
	const raw = process.env.SERVER_SECRET_KEY;
	if (!raw || raw.length < MIN_KEY_LENGTH) {
		throw new Error(`SERVER_SECRET_KEY must be set to a random string of at least ${MIN_KEY_LENGTH} characters (e.g. \`openssl rand -base64 48\`)`);
	}
	// Hash so any sufficiently long string (base64, hex, passphrase) becomes a 32-byte key.
	return createHash('sha256').update(raw).digest();
}

export function isSecretKeyConfigured(): boolean {
	return Boolean(process.env.SERVER_SECRET_KEY && process.env.SERVER_SECRET_KEY.length >= MIN_KEY_LENGTH);
}

export function sealSecret(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
	const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return [PREFIX, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':');
}

export function openSecret(sealed: string): string {
	const [version, iv, tag, ciphertext] = sealed.split(':');
	if (version !== PREFIX || !iv || !tag || !ciphertext) throw new Error('Stored secret is not in a recognised format');
	try {
		const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64url'));
		decipher.setAuthTag(Buffer.from(tag, 'base64url'));
		return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
	} catch {
		throw new Error('Could not decrypt a stored server secret — has SERVER_SECRET_KEY changed?');
	}
}

/** A URL-safe random secret for new managed servers (RCON, connect and GOTV passwords). */
export function generateSecret(bytes = 18): string {
	return randomBytes(bytes).toString('base64url');
}
