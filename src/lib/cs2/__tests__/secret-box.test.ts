/**
 * @jest-environment node
 */
import { generateSecret, isSecretKeyConfigured, openSecret, sealSecret } from '../secret-box';

const KEY = 'a'.repeat(40);

describe('secret-box', () => {
	beforeEach(() => {
		process.env.SERVER_SECRET_KEY = KEY;
	});
	afterAll(() => {
		delete process.env.SERVER_SECRET_KEY;
	});

	it('round-trips a secret', () => {
		expect(openSecret(sealSecret('hunter2 with ünïcode'))).toBe('hunter2 with ünïcode');
	});

	it('uses a fresh IV, so sealing twice gives different ciphertext', () => {
		expect(sealSecret('same')).not.toBe(sealSecret('same'));
	});

	it('never contains the plaintext', () => {
		expect(sealSecret('super-secret-rcon')).not.toContain('super-secret-rcon');
	});

	it('rejects tampered ciphertext', () => {
		const [v, iv, tag, ct] = sealSecret('x'.repeat(20)).split(':');
		const flipped = Buffer.from(ct, 'base64url');
		flipped[0] ^= 1;
		expect(() => openSecret([v, iv, tag, flipped.toString('base64url')].join(':'))).toThrow('SERVER_SECRET_KEY');
	});

	it('cannot be opened with a different key', () => {
		const sealed = sealSecret('pw');
		process.env.SERVER_SECRET_KEY = 'b'.repeat(40);
		expect(() => openSecret(sealed)).toThrow('SERVER_SECRET_KEY');
	});

	it('rejects values that are not in the sealed format', () => {
		expect(() => openSecret('plain-text')).toThrow('not in a recognised format');
	});

	it('refuses to run without a long enough key', () => {
		process.env.SERVER_SECRET_KEY = 'short';
		expect(isSecretKeyConfigured()).toBe(false);
		expect(() => sealSecret('pw')).toThrow('at least 32');
		delete process.env.SERVER_SECRET_KEY;
		expect(isSecretKeyConfigured()).toBe(false);
	});

	it('generates distinct url-safe secrets', () => {
		const a = generateSecret();
		expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(generateSecret()).not.toBe(a);
	});
});
