'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isOptimizable } from '@/lib/image-hosts';

export { isOptimizable };

const SIZES = {
	xs: { px: 20, box: 'h-5 w-5', pad: 'p-0.5', text: 'text-[9px]' },
	sm: { px: 32, box: 'h-8 w-8', pad: 'p-1', text: 'text-xs' },
	md: { px: 40, box: 'h-10 w-10', pad: 'p-1', text: 'text-xs' },
	lg: { px: 56, box: 'h-14 w-14', pad: 'p-1.5', text: 'text-base' },
	xl: { px: 80, box: 'h-20 w-20', pad: 'p-2', text: 'text-2xl' },
} as const;

export type TeamLogoSize = keyof typeof SIZES;

interface TeamLogoProps {
	src: string | null | undefined;
	/** Team name — used for the initials fallback and, unless `decorative`, the alt text. */
	name: string | null | undefined;
	size?: TeamLogoSize;
	/** true when the team name is printed right beside the logo, so screen readers don't hear it twice. */
	decorative?: boolean;
	/** Extra classes on the outer plate (e.g. responsive `sm:h-12 sm:w-12` overrides, dimming). */
	className?: string;
}

/**
 * Every team logo in the app. Uploaded logos are often dark artwork on a transparent background
 * (they vanish on the black stage), so the mark always sits on a light neutral "sponsor plate" —
 * the same treatment a broadcast overlay gives a sponsor lockup. Fixed square sizes keep rows
 * aligned; a missing or broken logo falls back to the team's initials on a dark tile.
 */
export function TeamLogo({ src, name, size = 'md', decorative = false, className }: TeamLogoProps) {
	// Keyed by src so a new logo (e.g. a fresh upload preview) gets a fresh attempt.
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const failed = !!src && failedSrc === src;
	const s = SIZES[size];
	const label = name?.trim() || 'Team';
	const alt = decorative ? '' : `${label} logo`;

	if (!src || failed) {
		return (
			<span
				role={decorative ? undefined : 'img'}
				aria-label={decorative ? undefined : alt}
				aria-hidden={decorative || undefined}
				className={cn('flex shrink-0 select-none items-center justify-center rounded-sm border border-border bg-neutral-900 font-black uppercase text-neutral-300', s.box, s.text, className)}
			>
				{label.substring(0, 2).toUpperCase()}
			</span>
		);
	}

	const imgClass = 'h-full w-full object-contain';
	return (
		<span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-100', s.box, s.pad, className)}>
			{/* SVG logos and hosts outside remotePatterns skip the optimizer (unoptimized) but keep lazy loading. */}
			<Image src={src} alt={alt} width={s.px} height={s.px} unoptimized={!isOptimizable(src)} className={imgClass} onError={() => setFailedSrc(src)} draggable={false} />
		</span>
	);
}
