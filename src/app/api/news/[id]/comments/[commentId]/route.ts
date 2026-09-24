import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { parseId } from '../../../_lib/auth';

type Params = { params: Promise<{ id: string; commentId: string }> };

/** DELETE /api/news/:id/comments/:commentId — the comment's author, or anyone with `content:manage`. */
export async function DELETE(_request: Request, { params }: Params) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const raw = await params;
	const postId = parseId(raw.id);
	const commentId = parseId(raw.commentId);
	if (postId === null || commentId === null) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

	try {
		const comment = await db.newsComment.findUnique({ where: { id: commentId }, select: { postId: true, authorId: true } });
		if (!comment || comment.postId !== postId) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

		if (comment.authorId !== session.user.id && !(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.newsComment.delete({ where: { id: commentId } });
		return NextResponse.json({ message: 'Comment deleted' });
	} catch (error) {
		console.error('Error deleting news comment:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
