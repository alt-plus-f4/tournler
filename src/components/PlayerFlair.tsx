import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import { LevelBadge } from '@/components/LevelBadge';
import { cn } from '@/lib/utils';
import type { PlayerFlair as PlayerFlairData, VerifiedMark as VerifiedMarkData } from '@/lib/models/player-flair';

/** Compact next-to-name badge mark (Verified by default), drawn from the badge's own artwork / icon and color. */
export function VerifiedMark({ badge, className }: { badge: VerifiedMarkData; className?: string }) {
	return (
		<span role='img' aria-label={badge.name} title={badge.name} className={cn('inline-flex shrink-0 items-center', className)}>
			<TrophyIcon badge={badge} size={19} decorative />
		</span>
	);
}

/**
 * Next-to-name badge (Verified by default) + FACEIT level, in that order, for placing right after a player's name. Renders
 * nothing for a player with neither; the level only appears when FACEIT actually returned one.
 */
export function PlayerFlair({ verified, faceitLevel, levelSize = 'sm', className }: Partial<PlayerFlairData> & { levelSize?: 'sm' | 'md'; className?: string }) {
	const hasLevel = typeof faceitLevel === 'number';
	if (!verified && !hasLevel) return null;
	return (
		<span className={cn('inline-flex shrink-0 items-center gap-1.5', className)}>
			{verified && <VerifiedMark badge={verified} />}
			{hasLevel && <LevelBadge level={faceitLevel} size={levelSize} />}
		</span>
	);
}
