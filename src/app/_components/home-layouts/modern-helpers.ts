import type { WeekDay } from '@/lib/home/standings';
import type { ModernWeekDay } from './ModernClient';

// Pure helpers for the MODERN homepage layout, kept free of server-only imports so they can be tested.

type WeekMatchLike = {
	id: number;
	matchDate: Date;
	status: string;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	tournament: { name: string; game: 'CS2' | 'LOL' };
	teamA: { name: string } | null;
	teamB: { name: string } | null;
};

/**
 * Day tabs for "This week": today plus every other day of the week that holds matches, in week order.
 * The tab that opens first is today when it has matches, else the next day with matches, else the
 * latest earlier day with matches (this week's results), else today. Empty when the week has no matches.
 */
export function buildWeekTabs<T extends WeekMatchLike>(days: WeekDay<T>[]): { days: ModernWeekDay[]; initialKey: string } {
	const todayIndex = days.findIndex((d) => d.isToday);
	if (!days.some((d) => d.matches.length > 0)) return { days: [], initialKey: '' };

	const tabs = days
		.map((day, i) => ({ day, i }))
		.filter(({ day }) => day.matches.length > 0 || day.isToday)
		.map(({ day, i }) => ({
			key: day.label.toLowerCase(),
			index: i,
			label: day.isToday ? 'Today' : todayIndex >= 0 && i === todayIndex + 1 ? 'Tomorrow' : day.label,
			rows: day.matches.map((m) => ({
				id: m.id,
				iso: m.matchDate.toISOString(),
				status: m.status,
				teamA: m.teamA?.name ?? 'TBD',
				teamB: m.teamB?.name ?? 'TBD',
				scoreA: m.scoreTeamA,
				scoreB: m.scoreTeamB,
				meta: `${m.tournament.game === 'LOL' ? 'LoL' : 'CS2'} · ${m.tournament.name}`,
			})),
		}));

	const withMatches = tabs.filter((t) => t.rows.length > 0);
	const today = tabs.find((t) => t.index === todayIndex);
	const initial = (today && today.rows.length > 0 ? today : undefined) ?? withMatches.find((t) => t.index > todayIndex) ?? [...withMatches].reverse().find((t) => t.index < todayIndex) ?? tabs[0];

	return { days: tabs.map(({ key, label, rows }) => ({ key, label, rows })), initialKey: initial.key };
}

export type TournamentBadge = { label: string; tone: 'solid' | 'outline' | 'muted' };

/** Status badge for a featured tournament card: open registration, in progress, full, pending start, or its start date. */
export function tournamentBadge(t: { status: string; startDate: Date; teamCapacity: number; registered: number }, now: number = Date.now()): TournamentBadge {
	if (t.status === 'ONGOING') return { label: 'In progress', tone: 'outline' };
	if (t.status === 'COMPLETED') return { label: 'Finished', tone: 'muted' };
	if (t.startDate.getTime() <= now) return { label: 'Start pending', tone: 'muted' };
	if (t.registered < t.teamCapacity) return { label: 'Registration open', tone: 'solid' };
	return { label: `Starts ${t.startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`, tone: 'muted' };
}

const FORMAT_LABEL: Record<string, string> = {
	SINGLE_ELIMINATION: 'Single elimination',
	DOUBLE_ELIMINATION: 'Double elimination',
	ROUND_ROBIN: 'Round robin',
	SWISS: 'Swiss',
};

export function formatLabel(format: string): string {
	return FORMAT_LABEL[format] ?? format;
}
