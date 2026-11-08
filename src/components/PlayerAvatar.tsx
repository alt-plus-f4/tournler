'use client';

import { useState } from 'react';
import Image from 'next/image';
import { isOptimizable } from '@/lib/image-hosts';
import { cn } from '@/lib/utils';
import { TrophyIcon, type TrophyVisual } from '@/components/trophies/TrophyIcon';

/**
 * Round player avatar for list rows. Hover/focus styling keys off the nearest `group/player`
 * ancestor (the row): border brightens to white and, when motion is allowed, the avatar zooms.
 * `badge` pins the player's avatar-corner badge (src/lib/badges/placement.ts avatarAward).
 */
export function PlayerAvatar({
	src,
	name,
	size = 32,
	className,
	badge,
}: {
	src: string | null | undefined;
	name: string | null | undefined;
	size?: number;
	className?: string;
	badge?: TrophyVisual | null;
}) {
	const avatar = <AvatarImage src={src} name={name} size={size} className={className} />;
	if (!badge) return avatar;
	const badgeSize = Math.max(12, Math.round(size * 0.42));
	return (
		<span className='relative inline-flex shrink-0' style={{ width: size, height: size }}>
			{avatar}
			<span title={badge.name} className='absolute -bottom-0.5 -right-0.5 flex overflow-hidden rounded-full ring-2 ring-black'>
				<TrophyIcon badge={badge} size={badgeSize} decorative />
			</span>
		</span>
	);
}

function AvatarImage({ src, name, size, className }: { src: string | null | undefined; name: string | null | undefined; size: number; className?: string }) {
	const [failed, setFailed] = useState(false);
	const classes = cn(
		'shrink-0 rounded-full border border-border transition duration-150 group-hover/player:border-white group-has-[a:focus-visible]/player:border-white motion-safe:group-hover/player:scale-[1.08]',
		className,
	);
	const style = { width: size, height: size };

	if (!src || failed) {
		return (
			<span aria-hidden style={style} className={cn('flex items-center justify-center bg-neutral-900 text-xs font-bold text-neutral-400', classes)}>
				{(name || '?').charAt(0).toUpperCase()}
			</span>
		);
	}
	// SVG avatars (DiceBear uploads) and hosts outside remotePatterns skip the optimizer but stay lazy.
	return <Image src={src} alt='' width={size} height={size} unoptimized={!isOptimizable(src)} style={style} className={cn('object-cover', classes)} onError={() => setFailed(true)} />;
}
