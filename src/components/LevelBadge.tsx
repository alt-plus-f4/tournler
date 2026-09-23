/** Our own 1-10 level color bands (grey through deep red) — used both for the badge's progress
 * ring below and for accents that key off a player's level elsewhere on the page (nickname
 * color, progress bar, stat highlights). */
export function levelColor(level: number): string {
	if (level >= 9) return '#E4483C'; // 9-10 — deep red
	if (level >= 7) return '#FF4B4B'; // 7-8 — red
	if (level >= 5) return '#F77F00'; // 5-6 — orange
	if (level >= 3) return '#FFC115'; // 3-4 — yellow
	return '#A9A9A9'; // 1-2 — grey
}

const SIZES = {
	sm: 20,
	md: 24,
	lg: 32,
} as const;

// Ring geometry: a 24x24 viewBox with a stroke-width-2.5 circle of radius 10 — leaves enough
// margin that the stroke doesn't clip against the viewBox edge.
const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * An original circular level badge — a progress ring (its arc length is level/10 of the full
 * circle) around a bold numeral, colored by `levelColor`. Rendered as inline SVG we own outright
 * (plain `<circle>`/`<text>`, no borrowed artwork or markup) rather than pointing at a
 * per-level image file.
 */
export function LevelBadge({ level, size = 'md', className = '' }: { level: number; size?: keyof typeof SIZES; className?: string }) {
	const px = SIZES[size];
	const clamped = Math.min(10, Math.max(1, Math.round(level)));
	const color = levelColor(clamped);
	const progressLength = (clamped / 10) * RING_CIRCUMFERENCE;

	return (
		<svg
			viewBox='0 0 24 24'
			width={px}
			height={px}
			role='img'
			aria-label={`Level ${level}`}
			className={`inline-block shrink-0 ${className}`}
		>
			<title>{`Level ${level}`}</title>
			<circle cx='12' cy='12' r={RING_RADIUS} fill='#0a0a0a' stroke='#2a2a2a' strokeWidth='2.5' />
			<circle
				cx='12'
				cy='12'
				r={RING_RADIUS}
				fill='none'
				stroke={color}
				strokeWidth='2.5'
				strokeLinecap='round'
				strokeDasharray={`${progressLength} ${RING_CIRCUMFERENCE}`}
				transform='rotate(-90 12 12)'
			/>
			<text x='12' y='12.5' textAnchor='middle' dominantBaseline='middle' fontSize='10' fontWeight='700' fontFamily='sans-serif' fill={color}>
				{clamped}
			</text>
		</svg>
	);
}
