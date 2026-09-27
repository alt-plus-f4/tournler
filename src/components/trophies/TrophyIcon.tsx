import Image from 'next/image';
import { BadgeIcon } from '@/lib/badge-icons';
import { cn } from '@/lib/utils';
import { isOptimizable } from '@/lib/image-hosts';

/** The subset of a Badge row needed to draw it. Public-safe: no timestamps or award counts. */
export interface TrophyVisual {
	name: string;
	icon: string;
	color: string;
	imageUrl?: string | null;
}

interface TrophyIconProps {
	badge: TrophyVisual;
	/** Rendered box size in px (square). */
	size: number;
	/**
	 * How the built-in icon fallback is framed when there's no uploaded artwork.
	 * - `disc`: a solid circle in the badge color with a white glyph (avatar overlays, profile trophies).
	 * - `tint`: a squared tile with a faint badge-color wash and a badge-color glyph (admin lists).
	 */
	fallback?: 'disc' | 'tint';
	/** Decorative when a neighbouring label already names the trophy. */
	decorative?: boolean;
	className?: string;
	priority?: boolean;
}

/** Draws a badge/trophy: its uploaded artwork when there is one, otherwise the curated icon in the badge color. */
export function TrophyIcon({ badge, size, fallback = 'disc', decorative = false, className, priority = false }: TrophyIconProps) {
	const alt = decorative ? '' : badge.name;

	if (badge.imageUrl) {
		return (
			<span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
				{/* SVG trophy art (and any host outside remotePatterns) is served as-is via `unoptimized`: the
				    optimizer refuses SVG, and it's still only ever drawn as an <img>, where embedded script can't run. */}
				<Image
					src={badge.imageUrl}
					alt={alt}
					width={size}
					height={size}
					unoptimized={!isOptimizable(badge.imageUrl)}
					loading={priority ? 'eager' : 'lazy'}
					fetchPriority={priority ? 'high' : undefined}
					className='h-full w-full object-contain'
				/>
			</span>
		);
	}

	const glyph = Math.round(size * (fallback === 'disc' ? 0.56 : 0.5));
	return (
		<span
			role={decorative ? undefined : 'img'}
			aria-label={decorative ? undefined : badge.name}
			aria-hidden={decorative || undefined}
			className={cn('inline-flex shrink-0 items-center justify-center', fallback === 'disc' ? 'rounded-full' : 'rounded-md border border-border', className)}
			style={{ width: size, height: size, backgroundColor: fallback === 'disc' ? badge.color : `${badge.color}20` }}
		>
			<BadgeIcon name={badge.icon} className={fallback === 'disc' ? 'text-white' : undefined} style={{ width: glyph, height: glyph, ...(fallback === 'tint' ? { color: badge.color } : {}) }} />
		</span>
	);
}
