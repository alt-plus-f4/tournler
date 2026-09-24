import { z } from 'zod';
import { isBlobUrl } from '@/lib/blob';
import { MAX_CONTENT_BYTES } from './content';

// Content is capped at 200KB; leave headroom for title/blurb/JSON framing.
const MAX_BODY_BYTES = MAX_CONTENT_BYTES + 16 * 1024;

export const postInputSchema = z.object({
	title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160, 'Title must be 160 characters or fewer'),
	content: z.unknown(),
	blurb: z.string().max(600, 'Summary must be 600 characters or fewer').optional(),
	imageUrl: z
		.string()
		.nullable()
		.optional()
		.refine((url) => url == null || url === '' || isBlobUrl(url), 'Cover image must be uploaded through Tournler'),
	isFeatured: z.boolean().optional(),
});

export type PostInput = z.infer<typeof postInputSchema>;

/** Reads a JSON body with a hard size cap. Returns null (and a message) when it's too big or not JSON. */
export async function readJsonBody(request: Request): Promise<{ body: unknown } | { error: string; status: number }> {
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > MAX_BODY_BYTES) return { error: 'Post is too long (200KB limit)', status: 413 };
	const text = await request.text();
	if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return { error: 'Post is too long (200KB limit)', status: 413 };
	try {
		return { body: JSON.parse(text) };
	} catch {
		return { error: 'Request body must be JSON', status: 400 };
	}
}
