import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getForumThread, parseId } from '@/components/forum/forum-queries';
import { moderateSchema } from '@/components/forum/forum-shared';
import { jsonError, validationError } from '@/components/forum/forum-api';

type Ctx = { params: Promise<{ threadId: string }> };

/** GET /api/forum/threads/[threadId] — public thread with its flat reply list (oldest first, with parentId for the chain; deleted replies redacted). */
export async function GET(_request: Request, { params }: Ctx) {
	try {
		const id = parseId((await params).threadId);
		if (!id) return jsonError('Thread not found', 404);
		const thread = await getForumThread(id);
		if (!thread) return jsonError('Thread not found', 404);
		return NextResponse.json({ thread });
	} catch (error) {
		console.error('Error fetching forum thread:', error);
		return jsonError('Internal server error', 500);
	}
}

/** PATCH /api/forum/threads/[threadId] — pin/unpin, lock/unlock. Requires `forum:moderate`. */
export async function PATCH(request: Request, { params }: Ctx) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Unauthorized', 401);
		if (!(await userHasPermission(session.user.id, 'forum:moderate'))) return jsonError('Forbidden', 403);

		const id = parseId((await params).threadId);
		if (!id) return jsonError('Thread not found', 404);

		const parsed = moderateSchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return validationError(parsed.error);

		const existing = await db.forumThread.findUnique({ where: { id }, select: { id: true } });
		if (!existing) return jsonError('Thread not found', 404);

		const thread = await db.forumThread.update({
			where: { id },
			data: parsed.data,
			select: { id: true, isPinned: true, isLocked: true },
		});
		return NextResponse.json({ thread });
	} catch (error) {
		console.error('Error moderating forum thread:', error);
		return jsonError('Internal server error', 500);
	}
}

/** DELETE /api/forum/threads/[threadId] — the thread's author, or `forum:moderate`. Replies cascade. */
export async function DELETE(_request: Request, { params }: Ctx) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Unauthorized', 401);

		const id = parseId((await params).threadId);
		if (!id) return jsonError('Thread not found', 404);

		const thread = await db.forumThread.findUnique({ where: { id }, select: { authorId: true } });
		if (!thread) return jsonError('Thread not found', 404);

		const allowed = thread.authorId === session.user.id || (await userHasPermission(session.user.id, 'forum:moderate'));
		if (!allowed) return jsonError('Forbidden', 403);

		await db.forumThread.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error('Error deleting forum thread:', error);
		return jsonError('Internal server error', 500);
	}
}
