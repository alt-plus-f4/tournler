/** Shared control-room table styling for /admin tables: hairline borders, tracked labels, tabular numerals. */
export const adminTable = {
	wrapper: 'overflow-x-auto rounded-lg border border-border bg-card',
	table: 'w-full text-sm',
	thead: 'border-b border-border bg-card',
	th: 'px-4 py-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap',
	tbody: 'divide-y divide-border',
	tr: 'transition-colors hover:bg-muted/50',
	td: 'px-4 py-3 align-middle',
	num: 'font-mono tabular-nums',
	empty: 'px-4 py-12 text-center text-sm text-muted-foreground',
	/** The name cell's real button/link that opens the row's editor. */
	rowAction: 'max-w-[28ch] truncate rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;

export function formatAdminDate(value: Date | string | null | undefined, withTime = false): string {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleString(undefined, withTime ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } : { year: 'numeric', month: '2-digit', day: '2-digit' });
}
