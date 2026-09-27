export type StatusFilter = 'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED';

export const STATUS_TABS: { value: StatusFilter; label: string }[] = [
	{ value: 'ALL', label: 'All' },
	{ value: 'LIVE', label: 'Live' },
	{ value: 'SCHEDULED', label: 'Upcoming' },
	{ value: 'COMPLETED', label: 'Completed' },
];

export function parseStatusFilter(value: string | undefined): StatusFilter {
	const upper = value?.trim().toUpperCase();
	return STATUS_TABS.some((t) => t.value === upper) ? (upper as StatusFilter) : 'ALL';
}
