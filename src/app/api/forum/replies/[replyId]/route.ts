import { NextResponse } from 'next/server';
import { db, type DbTx } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { parseId } from '@/components/forum/forum-queries';
import { jsonError } from '@/components/forum/forum-api';

const hasChildren = async (tx: DbTx, id: number) => (await tx.forumReply.findFirst({ where: { parentId: id }, select: { id: true } })) !== null;

/**
 * DELETE /api/forum/replies/[replyId] — the reply's author, or `forum:moderate`.
 * A reply that others answered is soft-deleted (a "[deleted]" placeholder keeps the chain under it
 * readable: body blanked, votes dropped); a reply without answers is removed outright, along with
 * any "[deleted]" ancestors that this leaves without answers.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ replyId: string }> }) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Unauthorized', 401);

		const id = parseId((await params).replyId);
		if (!id) return jsonError('Reply not found', 404);

		const reply = await db.forumReply.findUnique({ where: { id }, select: { authorId: true, deletedAt: true } });
		if (!reply || reply.deletedAt) return jsonError('Reply not found', 404);

		const allowed = reply.authorId === session.user.id || (await userHasPermission(session.user.id, 'forum:moderate'));
		if (!allowed) return jsonError('Forbidden', 403);

		const mode = await db.$transaction(async (tx) => {
			if (await hasChildren(tx, id)) {
				await tx.forumVote.deleteMany({ where: { replyId: id } });
				await tx.forumReply.update({ where: { id }, data: { deletedAt: new Date(), body: '', score: 0 } });
				return 'soft' as const;
			}
			const removed = await tx.forumReply.delete({ where: { id }, select: { parentId: true } });
			// Prune placeholders that only existed to hold this chain together.
			let parentId = removed.parentId;
			while (parentId !== null) {
				const parent = await tx.forumReply.findUnique({ where: { id: parentId }, select: { deletedAt: true, parentId: true } });
				if (!parent?.deletedAt || (await hasChildren(tx, parentId))) break;
				await tx.forumReply.delete({ where: { id: parentId } });
				parentId = parent.parentId;
			}
			return 'hard' as const;
		});
		return NextResponse.json({ ok: true, mode });
	} catch (error) {
		console.error('Error deleting forum reply:', error);
		return jsonError('Internal server error', 500);
	}
}
