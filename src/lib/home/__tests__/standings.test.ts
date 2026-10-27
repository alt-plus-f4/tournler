/** @jest-environment node */
import { bucketWeek, computeRanking, isoWeekNumber, weekRange, type RankingMatch, type RankingTeam } from '../standings';

const t = (id: number, name: string): RankingTeam => ({ id, name, logo: null });
const A = t(1, 'Alpha');
const B = t(2, 'Bravo');
const C = t(3, 'Charlie');

const m = (teamA: RankingTeam | null, teamB: RankingTeam | null, winnerId: number | null, a: number | null, b: number | null): RankingMatch => ({ teamA, teamB, winnerId, scoreTeamA: a, scoreTeamB: b });

describe('computeRanking', () => {
	it('awards 3 points per win and counts losses', () => {
		const rows = computeRanking([m(A, B, 1, 2, 0), m(A, C, 1, 2, 1), m(B, C, 2, 2, 0)]);
		expect(rows.map((r) => [r.name, r.points, r.wins, r.losses, r.played])).toEqual([
			['Alpha', 6, 2, 0, 2],
			['Bravo', 3, 1, 1, 2],
			['Charlie', 0, 0, 2, 2],
		]);
	});

	it('falls back to the score when no winner is stored and treats equal scores as a draw', () => {
		const rows = computeRanking([m(A, B, null, 1, 3), m(A, C, null, 1, 1)]);
		const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
		expect(byName.Bravo.points).toBe(3);
		expect(byName.Alpha).toMatchObject({ points: 1, draws: 1, losses: 1, played: 2 });
		expect(byName.Charlie).toMatchObject({ points: 1, draws: 1 });
	});

	it('skips matches with no result or a missing team', () => {
		expect(computeRanking([m(A, B, null, null, null), m(A, null, 1, 2, 0), m(null, null, null, 1, 0)])).toEqual([]);
	});

	it('breaks point ties by wins, then fewer games, then name', () => {
		// Bravo: 1 win (3). Alpha: 3 draws (3). Charlie: 1 win (3), same wins as Bravo but name later.
		const rows = computeRanking([m(A, C, null, 1, 1), m(A, B, null, 1, 1), m(A, t(4, 'Delta'), null, 0, 0), m(B, t(5, 'Echo'), 2, 2, 0), m(C, t(6, 'Foxtrot'), 3, 2, 0)]);
		expect(rows.slice(0, 3).map((r) => r.name)).toEqual(['Bravo', 'Charlie', 'Alpha']);
	});
});

describe('weekRange', () => {
	it('starts on Monday 00:00 UTC for any day in the week', () => {
		for (const day of ['2026-10-26T00:00:00Z', '2026-10-28T13:00:00Z', '2026-11-01T23:59:59Z']) {
			const { start, end } = weekRange(new Date(day));
			expect(start.toISOString()).toBe('2026-10-26T00:00:00.000Z');
			expect(end.toISOString()).toBe('2026-11-02T00:00:00.000Z');
		}
	});

	it('moves to the next week at Monday midnight UTC', () => {
		expect(weekRange(new Date('2026-11-02T00:00:00Z')).start.toISOString()).toBe('2026-11-02T00:00:00.000Z');
	});
});

describe('bucketWeek', () => {
	const now = new Date('2026-10-28T10:00:00Z'); // Wednesday
	it('groups matches by UTC day in time order and flags today', () => {
		const days = bucketWeek(
			[
				{ id: 3, matchDate: new Date('2026-10-28T15:30:00Z') },
				{ id: 2, matchDate: '2026-10-28T09:00:00Z' },
				{ id: 1, matchDate: new Date('2026-10-26T23:59:59Z') },
				{ id: 4, matchDate: new Date('2026-11-01T12:00:00Z') },
				{ id: 5, matchDate: new Date('2026-11-02T00:00:00Z') },
			],
			now,
		);
		expect(days.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
		expect(days.map((d) => d.matches.map((x) => x.id))).toEqual([[1], [], [2, 3], [], [], [], [4]]);
		expect(days.findIndex((d) => d.isToday)).toBe(2);
		expect(days[0]).toMatchObject({ date: 26, month: 'Oct', isWeekend: false });
		expect(days[6].isWeekend).toBe(true);
	});
});

describe('isoWeekNumber', () => {
	it('matches the ISO calendar', () => {
		expect(isoWeekNumber(new Date('2026-10-27T12:00:00Z'))).toBe(44);
		expect(isoWeekNumber(new Date('2026-01-01T00:00:00Z'))).toBe(1);
		expect(isoWeekNumber(new Date('2027-01-03T00:00:00Z'))).toBe(53);
	});
});
