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
 * GET /api/news/:id/comments — public, oldest first.
 * POST /api/news/:id/comments — any signed-in user; body `{ text }` (1–2000 chars).
 */

const COMMENT_COOLDOWN_MS = 10_000;
export async function GET(_request: Request, { params }: Params) {
	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	try {
		const comments = await db.newsComment.findMany({ where: { postId: id }, orderBy: { createdAt: 'asc' }, select: commentSelect });
		return NextResponse.json({ comments });
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
