import { buildReplyTree, parseReplySort, type FlatReply, type ReplyNode } from '../reply-tree';

const t0 = Date.UTC(2026, 0, 1);
const reply = (id: number, parentId: number | null, minute: number, score = 0): FlatReply => ({ id, parentId, score, createdAt: new Date(t0 + minute * 60_000) });

const ids = (nodes: ReplyNode<FlatReply>[]) => nodes.map((n) => n.reply.id);

describe('buildReplyTree', () => {
	// 1 ─┬─ 2 ── 4 ── 5
	//    └─ 3
	// 6
	const flat = [reply(1, null, 0, 1), reply(2, 1, 1, 0), reply(3, 1, 2, 5), reply(4, 2, 3), reply(5, 4, 4), reply(6, null, 5, 3)];

	it('numbers replies chronologically across the whole thread, independent of position', () => {
		const shuffled = [flat[4], flat[0], flat[5], flat[2], flat[1], flat[3]];
		const numbers = new Map<number, number>();
		const walk = (nodes: ReplyNode<FlatReply>[]) => nodes.forEach((n) => (numbers.set(n.reply.id, n.number), walk(n.children)));
		walk(buildReplyTree(shuffled, 'top'));
		expect(Object.fromEntries(numbers)).toEqual({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 });
	});

	it('nests children under their parent with depths and descendant counts', () => {
		const [first, second] = buildReplyTree(flat, 'oldest');
		expect(ids([first, second])).toEqual([1, 6]);
		expect(first.depth).toBe(0);
		expect(first.descendantCount).toBe(4);
		expect(ids(first.children)).toEqual([2, 3]);
		const four = first.children[0].children[0];
		expect(four.reply.id).toBe(4);
		expect(four.depth).toBe(2);
		expect(four.parent?.id).toBe(2);
		expect(four.parentNumber).toBe(2);
		expect(four.children[0].depth).toBe(3);
		expect(second.descendantCount).toBe(0);
	});

	it('sorts siblings by score, then oldest first, for "top"', () => {
		const roots = buildReplyTree(flat, 'top');
		expect(ids(roots)).toEqual([6, 1]);
		expect(ids(roots[1].children)).toEqual([3, 2]);
		const tied = buildReplyTree([reply(10, null, 5, 2), reply(11, null, 1, 2), reply(12, null, 3, 4)], 'top');
		expect(ids(tied)).toEqual([12, 11, 10]);
	});

	it('keeps replies with a missing parent at top level instead of dropping them', () => {
		const roots = buildReplyTree([reply(1, null, 0), reply(2, 99, 1)], 'oldest');
		expect(ids(roots)).toEqual([1, 2]);
		expect(roots[1].parent).toBeNull();
	});

	it('handles very deep chains without recursion', () => {
		const chain = Array.from({ length: 5000 }, (_, i) => reply(i + 1, i === 0 ? null : i, i));
		const [root] = buildReplyTree(chain);
		expect(root.descendantCount).toBe(4999);
		let node = root;
		while (node.children.length) node = node.children[0];
		expect(node.depth).toBe(4999);
		expect(node.number).toBe(5000);
	});

	it('returns an empty list for no replies', () => {
		expect(buildReplyTree([])).toEqual([]);
	});
});

describe('parseReplySort', () => {
	it('defaults to top', () => {
		expect(parseReplySort(undefined)).toBe('top');
		expect(parseReplySort('nonsense')).toBe('top');
		expect(parseReplySort('oldest')).toBe('oldest');
	});
});
