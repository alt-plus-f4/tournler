/**
 * FACEIT-style rank badge: a crest silhouette (not a plain circle) filled with one flat solid
 * color per level band — no gradients, matching FACEIT's own 1-10 progression from grey through
 * deep red. This is a hand-drawn vector recreation of that look, not a copy of FACEIT's own icon
 * files — their CDN path for those isn't publicly stable/documented, and the only places that do
 * serve them are unofficial mirrors of unknown provenance, not something worth depending on or
 * redistributing.
 */
export function levelColor(level: number): string {
	if (level >= 9) return '#E4483C'; // 9-10 — deep red
	if (level >= 7) return '#FF4B4B'; // 7-8 — red
	if (level >= 5) return '#F77F00'; // 5-6 — orange
	if (level >= 3) return '#FFC115'; // 3-4 — yellow
	return '#A9A9A9'; // 1-2 — grey
}

/** Darkens a `#rrggbb` color by a flat amount per channel — used for the badge's border facet, kept as a second flat tone rather than a gradient. */
function darken(hex: string, amount: number): string {
	const num = parseInt(hex.slice(1), 16);
	const r = Math.max(0, (num >> 16) - amount);
	const g = Math.max(0, ((num >> 8) & 0xff) - amount);
	const b = Math.max(0, (num & 0xff) - amount);
	return `rgb(${r}, ${g}, ${b})`;
}

// A crest: peaked top, shoulders widening out, long curve tapering to a point at the bottom —
// the classic rank-badge silhouette. OUTER is the full shape (rendered as a darker border facet);
// INNER is the same shape inset a few units (the tier color itself), giving a bordered-emblem
// look with two flat tones, no gradient.
const OUTER_PATH = 'M50 4 L88 20 Q96 24 96 34 L96 62 Q96 96 50 116 Q4 96 4 62 L4 34 Q4 24 12 20 Z';
const INNER_PATH = 'M50 11 L81 24 Q89 28 89 36 L89 60 Q89 89 50 107 Q11 89 11 60 L11 36 Q11 28 19 24 Z';

const SIZES = {
	sm: { box: 'h-5 w-[17px]', text: 'text-[9px]' },
	md: { box: 'h-6 w-[21px]', text: 'text-[11px]' },
	lg: { box: 'h-8 w-7', text: 'text-sm' },
} as const;

export function LevelBadge({ level, size = 'md', className = '' }: { level: number; size?: keyof typeof SIZES; className?: string }) {
	const color = levelColor(level);
	const s = SIZES[size];
	// FACEIT's own badges read best with a dark number on the lighter bands (grey/yellow/orange)
	// and a light number once the fill gets dark enough (red bands) — matching that rather than
	// one fixed text color that goes low-contrast on half the range.
	const textColor = level >= 7 ? '#fff' : '#0a0a0a';

	return (
		<span className={`relative inline-flex shrink-0 items-center justify-center ${s.box} ${className}`} title={`Level ${level}`}>
			<svg viewBox='0 0 100 116' className='absolute inset-0 h-full w-full' aria-hidden='true'>
				<path d={OUTER_PATH} fill={darken(color, 45)} />
				<path d={INNER_PATH} fill={color} />
			</svg>
			<span className={`relative font-black leading-none ${s.text}`} style={{ color: textColor }}>
				{level}
			</span>
		</span>
	);
}
