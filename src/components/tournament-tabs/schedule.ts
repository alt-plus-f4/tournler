export interface StartLabel {
	/** The prominent value, e.g. "May 18, 2026" or "Start pending". */
	value: string;
	/** The small caption under it. */
	label: string;
	/** An UPCOMING tournament whose scheduled start has already passed. */
	pending: boolean;
}

export function formatShortDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * What a tournament card should say about its start. Every UPCOMING tournament whose start time
 * has passed is waiting for an organizer (or the cron) to start it, so it reads "Start pending"
 * instead of a past date presented as upcoming. `status` is optional because some callers only
 * have the date; without it a past date is treated as pending too.
 */
export function getStartLabel(startDate: string, status?: string | null, now: number = Date.now()): StartLabel {
	if (status === 'ONGOING') return { value: 'In progress', label: 'Status', pending: false };
	if (status === 'COMPLETED') return { value: formatShortDate(startDate), label: 'Played', pending: false };
	if (new Date(startDate).getTime() <= now) return { value: 'Start pending', label: `Set for ${formatShortDate(startDate)}`, pending: true };
	return { value: formatShortDate(startDate), label: 'Starts', pending: false };
}
