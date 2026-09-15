/**
 * Flat-color rank badge matching FACEIT's own level color bands (1-10, grey through deep red) —
 * a shield rather than a plain circle so it reads as a rank insignia, not just a numbered dot.
 * No gradients: each band is one solid fill color.
 */
export function levelColor(level: number): string {
	if (level >= 9) return '#E4483C'; // 9-10 — deep red
	if (level >= 7) return '#FF4B4B'; // 7-8 — red
	if (level >= 5) return '#F77F00'; // 5-6 — orange
	if (level >= 3) return '#FFC115'; // 3-4 — yellow
	return '#A9A9A9'; // 1-2 — grey
}

const SHIELD_CLIP = 'polygon(50% 0%, 100% 32%, 100% 72%, 50% 100%, 0% 72%, 0% 32%)';

const SIZES = {
	sm: { box: 'h-[18px] w-[19px]', text: 'text-[9px]' },
	md: { box: 'h-6 w-[26px]', text: 'text-xs' },
	lg: { box: 'h-8 w-[34px]', text: 'text-sm' },
} as const;

export function LevelBadge({ level, size = 'md', className = '' }: { level: number; size?: keyof typeof SIZES; className?: string }) {
	const s = SIZES[size];
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center font-black leading-none text-black ${s.box} ${s.text} ${className}`}
			style={{ backgroundColor: levelColor(level), clipPath: SHIELD_CLIP }}
			title={`Level ${level}`}
		>
			{level}
		</span>
	);
}
