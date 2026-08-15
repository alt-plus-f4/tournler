export function formatPrize(prizePool: number | null | undefined): string {
	if (prizePool === null || prizePool === undefined) return 'TBD';
	return `$${prizePool.toLocaleString('en-US')}`;
}