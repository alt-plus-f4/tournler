import { formatScore, nextVote, planVote, toVoteValue, voteDelta, voteSchema, type VoteValue } from '../forum-votes';

describe('voteDelta', () => {
	it.each<[VoteValue, VoteValue, number]>([
		[0, 1, 1],
		[0, -1, -1],
		[1, 0, -1],
		[-1, 0, 1],
		[1, -1, -2],
		[-1, 1, 2],
		[1, 1, 0],
		[0, 0, 0],
	])('%i -> %i moves the score by %i', (from, to, delta) => {
		expect(voteDelta(from, to)).toBe(delta);
	});

	it('keeps the running score equal to the sum of votes across any sequence', () => {
		const sequence: VoteValue[] = [1, -1, -1, 0, 1, 0, 0, -1, 1];
		let score = 0;
		let current: VoteValue = 0;
		for (const next of sequence) {
			score += voteDelta(current, next);
			current = next;
			expect(score).toBe(current);
		}
	});
});

describe('nextVote', () => {
	it('clicking the chosen arrow removes the vote', () => {
		expect(nextVote(1, 1)).toBe(0);
		expect(nextVote(-1, -1)).toBe(0);
	});
	it('clicking the other arrow switches, and a fresh click sets it', () => {
		expect(nextVote(1, -1)).toBe(-1);
		expect(nextVote(-1, 1)).toBe(1);
		expect(nextVote(0, 1)).toBe(1);
		expect(nextVote(0, -1)).toBe(-1);
	});
});

describe('planVote', () => {
	it('does nothing when the vote is unchanged', () => {
		expect(planVote(0, 0)).toBeNull();
		expect(planVote(1, 1)).toBeNull();
	});
	it('creates a row for a first vote', () => {
		expect(planVote(0, -1)).toEqual({ kind: 'create', value: -1, delta: -1 });
	});
	it('updates the row when switching sides', () => {
		expect(planVote(1, -1)).toEqual({ kind: 'update', value: -1, delta: -2 });
	});
	it('deletes the row when the vote is removed', () => {
		expect(planVote(-1, 0)).toEqual({ kind: 'delete', delta: 1 });
	});
});

describe('voteSchema', () => {
	it('accepts only 1, -1 and 0', () => {
		for (const value of [1, -1, 0]) expect(voteSchema.safeParse({ value }).success).toBe(true);
		for (const value of [2, -2, 0.5, '1', null]) expect(voteSchema.safeParse({ value }).success).toBe(false);
		expect(voteSchema.safeParse({}).success).toBe(false);
	});
});

describe('helpers', () => {
	it('normalizes stored values', () => {
		expect(toVoteValue(undefined)).toBe(0);
		expect(toVoteValue(1)).toBe(1);
		expect(toVoteValue(-1)).toBe(-1);
		expect(toVoteValue(7)).toBe(0);
	});
	it('formats negative scores with a true minus sign', () => {
		expect(formatScore(12)).toBe('12');
		expect(formatScore(0)).toBe('0');
		expect(formatScore(-3)).toBe('−3');
	});
});
