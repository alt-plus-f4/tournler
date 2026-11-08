/** Tiny monochrome trend line (area + stroke) for a KPI tile. Decorative: the tile states the numbers. */
export function Sparkline({ values, width = 120, height = 36, className }: { values: number[]; width?: number; height?: number; className?: string }) {
	if (values.length < 2) return null;
	const max = Math.max(...values, 1);
	const pad = 3;
	const step = width / (values.length - 1);
	const points = values.map((v, i) => `${(i * step).toFixed(1)} ${(height - pad - (v / max) * (height - pad * 2)).toFixed(1)}`);
	const line = `M${points.join(' L')}`;
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className={className}>
			<path d={`${line} L${width} ${height} L0 ${height} Z`} fill='currentColor' opacity={0.08} />
			<path d={line} fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinejoin='round' strokeLinecap='round' />
		</svg>
	);
}
