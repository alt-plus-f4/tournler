import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { parseId } from '@/components/forum/forum-queries';
import { REPLY_COOLDOWN_MS, replySchema } from '@/components/forum/forum-shared';
import { cooldownResponse, jsonError, validationError } from '@/components/forum/forum-api';

/**
 * POST /api/forum/threads/[threadId]/replies — any signed-in user; one reply per 10s. Body
 * `{ body, parentId? }`: parentId answers another reply in the same thread (it must exist and not be
 * deleted); omitted, the reply answers the thread. Locked threads reject replies (423) except from
 * `forum:moderate`. Bumps the thread's lastActivityAt.
 */
export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Sign in to reply', 401);

		const threadId = parseId((await params).threadId);
		if (!threadId) return jsonError('Thread not found', 404);

		const parsed = replySchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return validationError(parsed.error);

		const thread = await db.forumThread.findUnique({ where: { id: threadId }, select: { isLocked: true } });
		if (!thread) return jsonError('Thread not found', 404);
		if (thread.isLocked && !(await userHasPermission(session.user.id, 'forum:moderate'))) {
			return jsonError('This thread is locked', 423);
		}

		const parentId = parsed.data.parentId ?? null;
		if (parentId !== null) {
			const parent = await db.forumReply.findUnique({ where: { id: parentId }, select: { threadId: true, deletedAt: true } });
			if (!parent || parent.threadId !== threadId) return jsonError('The reply you answered no longer exists', 404);
			if (parent.deletedAt) return jsonError("You can't reply to a deleted reply", 409);
		}

		const last = await db.forumReply.findFirst({ where: { authorId: session.user.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
		const limited = cooldownResponse(last?.createdAt, REPLY_COOLDOWN_MS, 'reply');
		if (limited) return limited;

		const now = new Date();
		const [reply] = await db.$transaction([
			db.forumReply.create({ data: { threadId, parentId, authorId: session.user.id, body: parsed.data.body, createdAt: now }, select: { id: true } }),
			db.forumThread.update({ where: { id: threadId }, data: { lastActivityAt: now } }),
		]);
		return NextResponse.json({ reply }, { status: 201 });
	} catch (error) {
		console.error('Error creating forum reply:', error);
		return jsonError('Internal server error', 500);
	}
}
