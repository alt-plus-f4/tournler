import { parseId } from '@/components/forum/forum-queries';
import { handleVoteRequest } from '@/components/forum/forum-vote-service';

/**
 * POST /api/forum/replies/[replyId]/vote — any signed-in user. Body `{ value: 1 | -1 | 0 }`
 * (0 removes the vote). Returns `{ score, myVote }`. Deleted replies can't be voted on (409).
 */
export async function POST(request: Request, { params }: { params: Promise<{ replyId: string }> }) {
	return handleVoteRequest(request, 'reply', parseId((await params).replyId));
}
