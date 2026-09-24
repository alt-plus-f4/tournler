import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { listForumThreads } from '@/components/forum/forum-queries';
import { THREAD_COOLDOWN_MS, parseCategorySlug, threadSchema } from '@/components/forum/forum-shared';
import { cooldownResponse, jsonError, validationError } from '@/components/forum/forum-api';

/**
 * GET /api/forum/threads?category=<slug>&page=<n> — public thread list, pinned first then by
 * latest activity, 30 per page.
 */
export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const rawCategory = url.searchParams.get('category');
		const category = parseCategorySlug(rawCategory);
		if (rawCategory && rawCategory !== 'all' && !category) return jsonError('Unknown category', 400);
		const page = Math.max(1, Math.min(10_000, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));

		const { threads, total, totalPages } = await listForumThreads({ category, page });
		return NextResponse.json({
			threads: threads.map(({ _count, ...thread }) => ({ ...thread, replyCount: _count.replies })),
			total,
			page,
			totalPages,
		});
	} catch (error) {
		console.error('Error listing forum threads:', error);
		return jsonError('Internal server error', 500);
	}
}

/** POST /api/forum/threads — any signed-in user; one new thread per 30s. */
export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Sign in to post', 401);

		const body = await request.json().catch(() => null);
		const parsed = threadSchema.safeParse(body);
		if (!parsed.success) return validationError(parsed.error);

		const last = await db.forumThread.findFirst({ where: { authorId: session.user.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
		const limited = cooldownResponse(last?.createdAt, THREAD_COOLDOWN_MS, 'thread');
		if (limited) return limited;

		const thread = await db.forumThread.create({
			data: { ...parsed.data, authorId: session.user.id },
			select: { id: true },
		});
		return NextResponse.json({ thread }, { status: 201 });
	} catch (error) {
		console.error('Error creating forum thread:', error);
		return jsonError('Internal server error', 500);
	}
}
