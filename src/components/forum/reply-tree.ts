/** Framework-free reply-chain builder (Reddit/HLTV-style nesting). Safe for server, client and tests. */

export type ReplySort = 'top' | 'oldest';
export const REPLY_SORTS: readonly ReplySort[] = ['top', 'oldest'];

/** Visual indentation stops here; deeper replies keep this indent and show a "replying to" hint. */
export const MAX_INDENT_DEPTH = 6;

export function parseReplySort(value: string | null | undefined): ReplySort {
	return value === 'oldest' ? 'oldest' : 'top';
}

export interface FlatReply {
	id: number;
	parentId: number | null;
	score: number;
	createdAt: Date;
}

export type ReplyNode<R extends FlatReply> = {
	reply: R;
	/** HLTV-style #N: position in chronological order across the whole thread, independent of the tree. */
	number: number;
	/** 0 for replies to the thread itself. */
	depth: number;
	/** The reply this one answers (null at top level). */
	parent: R | null;
	parentNumber: number | null;
	children: ReplyNode<R>[];
	/** Every reply below this one, at any depth. */
	descendantCount: number;
};

const byOldest = (a: FlatReply, b: FlatReply) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
const byTop = (a: FlatReply, b: FlatReply) => b.score - a.score || byOldest(a, b);

/**
 * Turns the flat, chronological reply list into a tree. Replies whose parent is missing (or in
 * another thread) are shown at top level rather than dropped. Iterative, so a very deep chain
 * can't overflow the stack.
 */
export function buildReplyTree<R extends FlatReply>(replies: readonly R[], sort: ReplySort = 'top'): ReplyNode<R>[] {
	const chronological = [...replies].sort(byOldest);
	const nodes = new Map<number, ReplyNode<R>>();
	chronological.forEach((reply, index) => {
		nodes.set(reply.id, { reply, number: index + 1, depth: 0, parent: null, parentNumber: null, children: [], descendantCount: 0 });
	});

	const roots: ReplyNode<R>[] = [];
	for (const reply of chronological) {
		const node = nodes.get(reply.id)!;
		const parent = reply.parentId != null && reply.parentId !== reply.id ? nodes.get(reply.parentId) : undefined;
		if (parent) {
			node.parent = parent.reply;
			node.parentNumber = parent.number;
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}

	const compare = sort === 'top' ? byTop : byOldest;
	const sortNodes = (list: ReplyNode<R>[]) => list.sort((a, b) => compare(a.reply, b.reply));
	sortNodes(roots);

	// Depth-first walk: assign depths top-down, then accumulate descendant counts bottom-up.
	// A parentId cycle can't reach a root, so its members never appear in the output.
	const order: ReplyNode<R>[] = [];
	const stack = [...roots];
	while (stack.length > 0) {
		const node = stack.pop()!;
		order.push(node);
		sortNodes(node.children);
		for (const child of node.children) {
			child.depth = node.depth + 1;
			stack.push(child);
		}
	}
	for (let i = order.length - 1; i >= 0; i--) {
		const node = order[i];
		node.descendantCount = node.children.reduce((sum, child) => sum + 1 + child.descendantCount, 0);
	}
	return roots;
}
