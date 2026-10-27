import { HomepageLayout } from '@prisma/client';

export type HomepageLayoutValue = HomepageLayout;

export const HOME_LAYOUTS: { value: HomepageLayoutValue; label: string; description: string }[] = [
	{ value: 'CLASSIC', label: 'Classic', description: 'Scoreboard hero with a sidebar.' },
	{ value: 'SEASON', label: 'Season hub', description: 'Season banner, registration countdown and ranking.' },
	{ value: 'DOORS', label: 'Two doors', description: 'Separate entry points for players and organizers.' },
	{ value: 'CAMPUS', label: 'Campus scoreboard', description: 'Live match, standings and this week side by side.' },
	{ value: 'WEEK', label: 'Week planner', description: 'The week as a day-by-day planner.' },
];

const VALUES = new Set<string>(HOME_LAYOUTS.map((layout) => layout.value));

/** Returns `value` when it is a known homepage layout, otherwise the default 'CLASSIC'. */
export function parseHomepageLayout(value: unknown): HomepageLayoutValue {
	return typeof value === 'string' && VALUES.has(value) ? (value as HomepageLayoutValue) : 'CLASSIC';
}
