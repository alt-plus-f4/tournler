import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { THREADS_PER_PAGE, type ForumCategoryValue } from './forum-shared';

/** Public author shape: never expose email, role, or anything beyond id/name/image. */
export const publicAuthorSelect = { id: true, name: true, image: true } satisfies Prisma.UserSelect;

/** Reply counts leave out soft-deleted "[deleted]" placeholders. */
const visibleRepliesCount = { where: { deletedAt: null } } satisfies Prisma.ForumThreadCountOutputTypeCountRepliesArgs;

const threadListSelect = {
	id: true,
	title: true,
	category: true,
	isPinned: true,
	isLocked: true,
	score: true,
	lastActivityAt: true,
	createdAt: true,
	author: { select: publicAuthorSelect },
	_count: { select: { replies: visibleRepliesCount } },
} satisfies Prisma.ForumThreadSelect;

export type ForumThreadListItem = Prisma.ForumThreadGetPayload<{ select: typeof threadListSelect }>;

export async function listForumThreads({ category, page }: { category: ForumCategoryValue | null; page: number }) {
	const where: Prisma.ForumThreadWhereInput = category ? { category } : {};
	const [threads, total] = await Promise.all([
		db.forumThread.findMany({
			where,
			orderBy: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }],
			skip: (page - 1) * THREADS_PER_PAGE,
			take: THREADS_PER_PAGE,
			select: threadListSelect,
		}),
		db.forumThread.count({ where }),
	]);
	return { threads, total, totalPages: Math.max(1, Math.ceil(total / THREADS_PER_PAGE)) };
}

/**
 * listForumThreads in the shared data cache, for the public /forum page (threads embed author
 * names/avatars, hence 'users'). The admin page and the API keep reading live via listForumThreads.
 */
export const listForumThreadsCached = cachedQuery(listForumThreads, ['forum-thread-list'], { tags: ['forum', 'users'], revalidate: REVALIDATE.standard });

/** Most recently active threads for the homepage block (pinned threads get no special treatment here). */
export function recentForumThreads(take = 8) {
	return db.forumThread.findMany({
		orderBy: { lastActivityAt: 'desc' },
		take,
		select: { id: true, title: true, _count: { select: { replies: visibleRepliesCount } } },
	});
}

export async function getForumThread(id: number) {
	const thread = await db.forumThread.findUnique({
		where: { id },
		select: {
			id: true,
			title: true,
			body: true,
			category: true,
			isPinned: true,
			isLocked: true,
			score: true,
			createdAt: true,
			lastActivityAt: true,
			author: { select: publicAuthorSelect },
			replies: {
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				select: { id: true, parentId: true, body: true, score: true, createdAt: true, deletedAt: true, author: { select: publicAuthorSelect } },
			},
		},
	});
	if (!thread) return null;
	// Soft-deleted replies stay in the chain as "[deleted]" placeholders: their body, author and
	// score never leave the server (this payload is cached and served publicly).
	const replies = thread.replies.map((reply) => (reply.deletedAt ? { ...reply, body: '', score: 0, author: null } : reply));
	return { ...thread, replies };
}

/**
 * getForumThread in the shared data cache, for the public /forum/[id] page (thread + replies with
 * authors). A null (missing thread) is cached too; creating or deleting threads flushes 'forum'.
 */
export const getForumThreadCached = cachedQuery(getForumThread, ['forum-thread'], { tags: ['forum', 'users'], revalidate: REVALIDATE.standard });

export type ForumThreadDetail = NonNullable<Awaited<ReturnType<typeof getForumThread>>>;
export type ForumReplyItem = ForumThreadDetail['replies'][number];

/** Parses a route segment into a positive integer id, or null. */
export function parseId(value: string): number | null {
	if (!/^\d{1,10}$/.test(value)) return null;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}
