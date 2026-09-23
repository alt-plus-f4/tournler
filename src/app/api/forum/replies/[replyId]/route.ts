import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { parseId } from '@/components/forum/forum-queries';
import { jsonError } from '@/components/forum/forum-api';

/** DELETE /api/forum/replies/[replyId] — the reply's author, or `forum:moderate`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ replyId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Unauthorized', 401);

		const id = parseId((await params).replyId);
		if (!id) return jsonError('Reply not found', 404);

		const reply = await db.forumReply.findUnique({ where: { id }, select: { authorId: true } });
		if (!reply) return jsonError('Reply not found', 404);

		const allowed = reply.authorId === session.user.id || (await userHasPermission(session.user.id, 'forum:moderate'));
		if (!allowed) return jsonError('Forbidden', 403);

		await db.forumReply.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error('Error deleting forum reply:', error);
		return jsonError('Internal server error', 500);
	}
}
