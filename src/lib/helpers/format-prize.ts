export function formatPrize(prizePool: number): string {
	return `$${prizePool.toLocaleString('en-US')}`;
}