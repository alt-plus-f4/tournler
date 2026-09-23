const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Prize pools and other whole-dollar amounts: 1500000 → "$1,500,000". */
export function formatMoney(amount: number | null | undefined): string {
	return usd.format(amount ?? 0);
}
