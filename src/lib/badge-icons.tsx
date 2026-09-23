import { Trophy, Award, Star, Crown, Medal, Zap, Flame, Shield, Target, Rocket, Gem, ThumbsUp, Swords, Sparkles, BadgeCheck, type LucideIcon } from 'lucide-react';

/** Curated icon set for badge definitions — a fixed key rather than an arbitrary icon upload keeps the admin picker simple and every badge visually consistent. */
export const BADGE_ICONS: Record<string, LucideIcon> = {
	trophy: Trophy,
	award: Award,
	star: Star,
	crown: Crown,
	medal: Medal,
	zap: Zap,
	flame: Flame,
	shield: Shield,
	target: Target,
	rocket: Rocket,
	gem: Gem,
	'thumbs-up': ThumbsUp,
	swords: Swords,
	sparkles: Sparkles,
	verified: BadgeCheck,
};

export const BADGE_ICON_KEYS = Object.keys(BADGE_ICONS);

interface BadgeIconProps {
	name: string;
	className?: string;
	style?: React.CSSProperties;
}

/** Looks up a badge's icon by its stored key, falling back to Award for an unrecognized/legacy key. */
export function BadgeIcon({ name, className, style }: BadgeIconProps) {
	const Icon = BADGE_ICONS[name] ?? Award;
	return <Icon className={className} style={style} />;
}

/** Uploaded trophy artwork: allowed types and size cap, shared by the admin upload route and the dialog. */
export const BADGE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export const BADGE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** True only for an https URL in this project's Vercel Blob store under the `badges/` prefix the upload route writes to. */
export function isBadgeImageUrl(value: unknown): value is string {
	if (typeof value !== 'string' || value.length > 2048) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') && url.pathname.startsWith('/badges/');
	} catch {
		return false;
	}
}
