import { parseId } from '@/components/forum/forum-queries';
import { handleVoteRequest } from '@/components/forum/forum-vote-service';

/**
 * POST /api/forum/threads/[threadId]/vote — any signed-in user. Body `{ value: 1 | -1 | 0 }`
 * (0 removes the vote). Returns `{ score, myVote }`. At most 30 vote changes per user per minute.
 */
export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
	return handleVoteRequest(request, 'thread', parseId((await params).threadId));
}
