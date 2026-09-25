import 'server-only';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db, type DbTx } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { planVote, toVoteValue, voteSchema, VOTE_RATE_LIMIT, VOTE_RATE_WINDOW_MS, type VoteValue } from './forum-votes';
import { jsonError, validationError } from './forum-api';

export type VoteTarget = { kind: 'thread'; id: number } | { kind: 'reply'; id: number };

class VoteError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

/** A concurrent request changed this user's vote between our read and write; the attempt is retried. */
class VoteConflict extends Error {}

const TARGET_MISSING = { thread: 'Thread not found', reply: 'Reply not found' } as const;

/** Moves the target's denormalized score by `delta` and returns the new score; refuses missing or soft-deleted replies. */
async function bumpScore(tx: DbTx, target: VoteTarget, delta: number): Promise<number> {
	if (target.kind === 'thread') {
		if (delta !== 0) {
			const { count } = await tx.forumThread.updateMany({ where: { id: target.id }, data: { score: { increment: delta } } });
			if (count === 0) throw new VoteError(404, TARGET_MISSING.thread);
		}
		const row = await tx.forumThread.findUnique({ where: { id: target.id }, select: { score: true } });
		if (!row) throw new VoteError(404, TARGET_MISSING.thread);
		return row.score;
	}
	// The deletedAt filter makes "not soft-deleted" part of the write itself, not a separate check.
	const { count } = delta !== 0 ? await tx.forumReply.updateMany({ where: { id: target.id, deletedAt: null }, data: { score: { increment: delta } } }) : { count: 1 };
	const row = await tx.forumReply.findUnique({ where: { id: target.id }, select: { score: true, deletedAt: true } });
	if (!row) throw new VoteError(404, TARGET_MISSING.reply);
	if (row.deletedAt || count === 0) throw new VoteError(409, "You can't vote on a deleted reply");
	return row.score;
}

/**
 * Sets this user's vote on a thread or reply and adjusts the stored score by the difference in the
 * same transaction (never a recount). Vote writes are conditional on the value we read, so two
 * racing requests from one user can't double-apply a delta; the loser retries against fresh state.
 */
export async function castVote(userId: string, target: VoteTarget, value: VoteValue): Promise<{ score: number; myVote: VoteValue }> {
	const key = target.kind === 'thread' ? { userId_threadId: { userId, threadId: target.id } } : { userId_replyId: { userId, replyId: target.id } };
	const link = target.kind === 'thread' ? { threadId: target.id } : { replyId: target.id };

	for (let attempt = 0; ; attempt++) {
		try {
			return await db.$transaction(async (tx) => {
				const existing = await tx.forumVote.findUnique({ where: key, select: { id: true, value: true } });
				const plan = planVote(toVoteValue(existing?.value), value);
				if (plan?.kind === 'create') {
					await tx.forumVote.create({ data: { userId, ...link, value: plan.value } });
				} else if (plan && existing) {
					const where = { id: existing.id, value: existing.value };
					const { count } = plan.kind === 'update' ? await tx.forumVote.updateMany({ where, data: { value: plan.value } }) : await tx.forumVote.deleteMany({ where });
					if (count !== 1) throw new VoteConflict();
				}
				const score = await bumpScore(tx, target, plan?.delta ?? 0);
				return { score, myVote: value };
			});
		} catch (error) {
			const raced = error instanceof VoteConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
			if (raced && attempt < 2) continue;
			throw error;
		}
	}
}

/** Shared POST handler body for both vote endpoints. */
export async function handleVoteRequest(request: Request, kind: VoteTarget['kind'], id: number | null) {
	try {
		const session = await getAuthSession();
		if (!session) return jsonError('Sign in to vote', 401);
		if (!id) return jsonError(TARGET_MISSING[kind], 404);
		const target: VoteTarget = { kind, id };

		const parsed = voteSchema.safeParse(await request.json().catch(() => null));
		if (!parsed.success) return validationError(parsed.error);

		const recent = await db.forumVote.count({ where: { userId: session.user.id, updatedAt: { gte: new Date(Date.now() - VOTE_RATE_WINDOW_MS) } } });
		if (recent >= VOTE_RATE_LIMIT) {
			return NextResponse.json({ error: "You're voting too fast. Wait a minute and try again." }, { status: 429, headers: { 'Retry-After': '60' } });
		}

		const result = await castVote(session.user.id, target, parsed.data.value);
		return NextResponse.json(result);
	} catch (error) {
		if (error instanceof VoteError) return jsonError(error.message, error.status);
		console.error('Error recording forum vote:', error);
		return jsonError('Internal server error', 500);
	}
}
