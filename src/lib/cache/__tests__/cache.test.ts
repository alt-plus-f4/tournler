/**
 * @jest-environment node
 *
 * The cache layer's two correctness guarantees: cached queries return the same shapes as raw
 * queries (Dates survive the JSON round trip), and every Prisma model that pages read maps to at
 * least one cache domain, so a write can never leave a page stale.
 */
import fs from 'fs';
import path from 'path';

jest.mock('server-only', () => ({}));
const store = new Map<string, unknown>();
const revalidateTag = jest.fn();
jest.mock('next/cache', () => ({
	// Minimal stand-in: JSON round-trip like the real data cache, keyed by keyParts + args.
	unstable_cache: (fn: (...a: unknown[]) => Promise<unknown>, keyParts: string[]) => async (...args: unknown[]) => {
		const key = JSON.stringify([keyParts, args]);
		if (!store.has(key)) store.set(key, JSON.parse(JSON.stringify(await fn(...args))));
		return JSON.parse(JSON.stringify(store.get(key)));
	},
	revalidateTag: (...a: unknown[]) => revalidateTag(...a),
}));
jest.mock('next/server', () => ({ after: () => {} }));

import { cachedQuery } from '@/lib/cache/cached-query';
import { MODEL_TAGS, invalidateTags } from '@/lib/cache/tags';

describe('cachedQuery', () => {
	beforeEach(() => store.clear());

	it('revives Date objects (nested, in arrays) after the JSON round trip', async () => {
		const when = new Date('2026-09-24T10:00:00.000Z');
		const q = cachedQuery(async (id: number) => ({ id, startDate: when, matches: [{ matchDate: when, maybe: null }] }), ['t'], { tags: ['tournaments'], revalidate: 60 });
		await q(1); // populate
		const hit = await q(1); // served from the (serialized) cache
		expect(hit.startDate).toBeInstanceOf(Date);
		expect(hit.startDate.toISOString()).toBe(when.toISOString());
		expect(hit.matches[0].matchDate).toBeInstanceOf(Date);
		expect(hit.matches[0].maybe).toBeNull();
	});

	it('keeps plain objects that merely have a $date-like key alone unless it is the only key', async () => {
		const q = cachedQuery(async () => ({ meta: { $date: 'x', other: 1 } }), ['k'], { tags: ['news'], revalidate: 60 });
		await q();
		expect((await q()).meta).toEqual({ $date: 'x', other: 1 });
	});
});

describe('MODEL_TAGS', () => {
	it('maps every content model in the Prisma schema', () => {
		const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
		const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
		// Auth plumbing that no cached page query reads.
		const ignored = new Set(['Account', 'Session', 'VerificationToken']);
		const unmapped = models.filter((m) => !ignored.has(m) && !(MODEL_TAGS[m]?.length));
		expect(unmapped).toEqual([]);
	});
});

describe('invalidateTags', () => {
	it('expires each distinct tag immediately', () => {
		revalidateTag.mockClear();
		invalidateTags(['matches', 'tournaments', 'matches']);
		expect(revalidateTag.mock.calls).toEqual([
			['matches', { expire: 0 }],
			['tournaments', { expire: 0 }],
		]);
	});

	it('never throws outside a request scope', () => {
		revalidateTag.mockImplementationOnce(() => {
			throw new Error('static generation store missing');
		});
		expect(() => invalidateTags(['forum'])).not.toThrow();
	});
});
