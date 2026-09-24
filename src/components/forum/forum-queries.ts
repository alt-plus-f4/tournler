import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { THREADS_PER_PAGE, type ForumCategoryValue } from './forum-shared';

/** Public author shape: never expose email, role, or anything beyond id/name/image. */
export const publicAuthorSelect = { id: true, name: true, image: true } satisfies Prisma.UserSelect;

const threadListSelect = {
	id: true,
	title: true,
	category: true,
	isPinned: true,
	isLocked: true,
	lastActivityAt: true,
	createdAt: true,
	author: { select: publicAuthorSelect },
	_count: { select: { replies: true } },
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

/** Most recently active threads for the homepage block (pinned threads get no special treatment here). */
export function recentForumThreads(take = 8) {
	return db.forumThread.findMany({
		orderBy: { lastActivityAt: 'desc' },
		take,
		select: { id: true, title: true, _count: { select: { replies: true } } },
	});
}

export function getForumThread(id: number) {
	return db.forumThread.findUnique({
		where: { id },
		select: {
			id: true,
			title: true,
			body: true,
			category: true,
			isPinned: true,
			isLocked: true,
			createdAt: true,
			lastActivityAt: true,
			author: { select: publicAuthorSelect },
			replies: {
				orderBy: { createdAt: 'asc' },
				select: { id: true, body: true, createdAt: true, author: { select: publicAuthorSelect } },
			},
		},
	});
}

export type ForumThreadDetail = NonNullable<Awaited<ReturnType<typeof getForumThread>>>;

/** Parses a route segment into a positive integer id, or null. */
export function parseId(value: string): number | null {
	if (!/^\d{1,10}$/.test(value)) return null;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}
