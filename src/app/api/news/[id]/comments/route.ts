import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { parseId } from '../../_lib/auth';
import { commentSelect } from '../../_lib/comments';

type Params = { params: Promise<{ id: string }> };

const commentSchema = z.object({
	text: z.string().trim().min(1, 'Write a comment first').max(2000, 'Comments are limited to 2000 characters'),
});

/**
 * GET /api/news/:id/comments — public, oldest first, cursor-paginated: `?cursor=<comment id>&limit=`
 * (default 50, max 100). Responds `{ comments, nextCursor, total }`; `nextCursor` is the id of the
 * first comment of the next page (pass it back as `cursor`, inclusive) or null on the last page.
 * POST /api/news/:id/comments — any signed-in user; body `{ text }` (1–2000 chars).
 */

const COMMENT_COOLDOWN_MS = 10_000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request, { params }: Params) {
	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	const { searchParams } = new URL(request.url);
	const rawCursor = searchParams.get('cursor');
	const cursor = rawCursor === null ? null : parseId(rawCursor);
	if (rawCursor !== null && cursor === null) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });

	const rawLimit = searchParams.get('limit');
	const limit = rawLimit === null ? DEFAULT_PAGE_SIZE : Number.parseInt(rawLimit, 10);
	if (!Number.isInteger(limit) || limit < 1) return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
	const take = Math.min(limit, MAX_PAGE_SIZE);

	try {
		const [rows, total] = await Promise.all([
			db.newsComment.findMany({
				where: { postId: id },
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				take: take + 1,
				...(cursor !== null ? { cursor: { id: cursor } } : {}),
				select: commentSelect,
			}),
			db.newsComment.count({ where: { postId: id } }),
		]);
		const comments = rows.slice(0, take);
		return NextResponse.json({ comments, nextCursor: rows.length > take ? rows[take].id : null, total });
	} catch (error) {
		console.error('Error fetching news comments:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: Request, { params }: Params) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 });

	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	const parsed = commentSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid comment' }, { status: 400 });

	try {
		const post = await db.newsPost.findUnique({ where: { id }, select: { id: true } });
		if (!post) return NextResponse.json({ error: 'News post not found' }, { status: 404 });

		// Same spam guard as forum replies: one comment per user every 10 seconds.
		const last = await db.newsComment.findFirst({ where: { authorId: session.user.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
		const waitMs = last ? COMMENT_COOLDOWN_MS - (Date.now() - last.createdAt.getTime()) : 0;
		if (waitMs > 0) {
			const seconds = Math.ceil(waitMs / 1000);
			return NextResponse.json({ error: `You're commenting too fast. Wait ${seconds}s and try again.` }, { status: 429, headers: { 'Retry-After': String(seconds) } });
		}

		const comment = await db.newsComment.create({
			data: { postId: id, authorId: session.user.id, text: parsed.data.text },
			select: commentSelect,
		});
		return NextResponse.json({ comment }, { status: 201 });
	} catch (error) {
		console.error('Error creating news comment:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
