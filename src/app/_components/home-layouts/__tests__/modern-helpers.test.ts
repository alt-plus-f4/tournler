/** @jest-environment node */
import { bucketWeek } from '@/lib/home/standings';
import { buildWeekTabs, formatLabel, tournamentBadge } from '../modern-helpers';

// Wednesday 2026-11-04 12:00 UTC; the week runs Mon 2 Nov .. Sun 8 Nov.
const NOW = new Date('2026-11-04T12:00:00Z');

let nextId = 1;
const match = (iso: string, status = 'SCHEDULED') => ({
	id: nextId++,
	matchDate: new Date(iso),
	status,
	scoreTeamA: status === 'SCHEDULED' ? null : 1,
	scoreTeamB: status === 'SCHEDULED' ? null : 0,
	tournament: { name: 'Winter Cup', game: 'CS2' as const },
	teamA: { name: 'Owls' },
	teamB: null,
});

describe('buildWeekTabs', () => {
	it('is empty when the week has no matches', () => {
		expect(buildWeekTabs(bucketWeek([], NOW))).toEqual({ days: [], initialKey: '' });
	});

	it('lists today plus days with matches, labels today and tomorrow, and opens on today when it has matches', () => {
		const { days, initialKey } = buildWeekTabs(bucketWeek([match('2026-11-02T18:00:00Z', 'COMPLETED'), match('2026-11-04T16:30:00Z', 'LIVE'), match('2026-11-05T18:00:00Z')], NOW));
		expect(days.map((d) => [d.label, d.rows.length])).toEqual([
			['Mon', 1],
			['Today', 1],
			['Tomorrow', 1],
		]);
		expect(initialKey).toBe('wed');
		expect(days[1].rows[0]).toMatchObject({ status: 'LIVE', teamA: 'Owls', teamB: 'TBD', meta: 'CS2 · Winter Cup' });
	});

	it('opens on the next day with matches when today is empty, else the latest earlier one', () => {
		expect(buildWeekTabs(bucketWeek([match('2026-11-02T18:00:00Z'), match('2026-11-07T18:00:00Z')], NOW)).initialKey).toBe('sat');
		expect(buildWeekTabs(bucketWeek([match('2026-11-02T18:00:00Z'), match('2026-11-03T18:00:00Z')], NOW)).initialKey).toBe('tue');
	});
});

describe('tournamentBadge', () => {
	const now = NOW.getTime();
	const future = new Date('2026-11-14T11:00:00Z');
	it('reads open, full, in progress and pending', () => {
		expect(tournamentBadge({ status: 'UPCOMING', startDate: future, teamCapacity: 16, registered: 12 }, now)).toEqual({ label: 'Registration open', tone: 'solid' });
		expect(tournamentBadge({ status: 'UPCOMING', startDate: future, teamCapacity: 16, registered: 16 }, now).label).toBe('Starts 14 Nov');
		expect(tournamentBadge({ status: 'ONGOING', startDate: NOW, teamCapacity: 16, registered: 16 }, now).label).toBe('In progress');
		expect(tournamentBadge({ status: 'UPCOMING', startDate: new Date('2026-11-01T00:00:00Z'), teamCapacity: 16, registered: 3 }, now).label).toBe('Start pending');
	});
});

it('formatLabel names the bracket formats', () => {
	expect(formatLabel('DOUBLE_ELIMINATION')).toBe('Double elimination');
	expect(formatLabel('SWISS')).toBe('Swiss');
});
