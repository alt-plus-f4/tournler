/**
 * Where awarded badges are displayed. Pure and client-safe.
 *
 * Each Badge has three admin-set placement flags (trophy row, avatar corner, next to the name); all
 * off means the badge is hidden everywhere while players keep the award. When the site allows
 * player choice (SiteSettings.playerBadgeChoice), a player can also hide individual awards
 * (UserBadge.hidden) and pick which eligible badge sits on their avatar (User.avatarBadgeId).
 */

export const BADGE_PLACEMENTS = ['showInTrophyRow', 'showOnAvatar', 'showNextToName'] as const;
export type BadgePlacement = (typeof BADGE_PLACEMENTS)[number];

export type BadgePlacementFlags = Record<BadgePlacement, boolean>;

export const BADGE_PLACEMENT_LABELS: Record<BadgePlacement, string> = {
	showInTrophyRow: 'Trophy row',
	showOnAvatar: 'On avatar',
	showNextToName: 'Next to name',
};

export interface PlacedAward<B extends { id: number } & Partial<BadgePlacementFlags> = { id: number } & Partial<BadgePlacementFlags>> {
	/** Hidden by the player (only honoured while player choice is allowed). */
	hidden?: boolean;
	badge: B;
}

export interface PlacementOptions {
	/** SiteSettings.playerBadgeChoice. */
	playerChoice: boolean;
	/** User.avatarBadgeId: the player's pick for the avatar corner. */
	avatarBadgeId?: number | null;
}

/** Shown somewhere, or hidden everywhere (the admin matrix's "Status" column). */
export function badgeStatus(flags: BadgePlacementFlags): 'shown' | 'hidden' {
	return BADGE_PLACEMENTS.some((p) => flags[p]) ? 'shown' : 'hidden';
}

/** Awards the player hasn't hidden (their hidden flags only count while player choice is on). */
export function visibleAwards<A extends PlacedAward>(awards: A[], { playerChoice }: Pick<PlacementOptions, 'playerChoice'>): A[] {
	return playerChoice ? awards.filter((a) => !a.hidden) : awards;
}

/** Awards for one placement, in the given order. */
export function awardsFor<A extends PlacedAward>(awards: A[], placement: BadgePlacement, options: Pick<PlacementOptions, 'playerChoice'>): A[] {
	return visibleAwards(awards, options).filter((a) => a.badge[placement]);
}

/** Badges a player may choose for their avatar corner. */
export function avatarCandidates<A extends PlacedAward>(awards: A[], options: Pick<PlacementOptions, 'playerChoice'>): A[] {
	return awardsFor(awards, 'showOnAvatar', options);
}

/**
 * The one award shown in the avatar corner: the player's pick when allowed and still eligible,
 * otherwise the first eligible award (callers pass awards newest first).
 */
export function avatarAward<A extends PlacedAward>(awards: A[], options: PlacementOptions): A | null {
	const candidates = avatarCandidates(awards, options);
	if (options.playerChoice && options.avatarBadgeId != null) {
		const picked = candidates.find((a) => a.badge.id === options.avatarBadgeId);
		if (picked) return picked;
	}
	return candidates[0] ?? null;
}

/** Validates a placement-flags patch body: only known keys, booleans only. */
export function parsePlacementPatch(body: unknown): Partial<BadgePlacementFlags> | { error: string } {
	if (!body || typeof body !== 'object') return { error: 'Expected a JSON object' };
	const out: Partial<BadgePlacementFlags> = {};
	for (const key of BADGE_PLACEMENTS) {
		const value = (body as Record<string, unknown>)[key];
		if (value === undefined) continue;
		if (typeof value !== 'boolean') return { error: `${key} must be a boolean` };
		out[key] = value;
	}
	return out;
}

/** A positive id that fits Postgres INT4, so Prisma never gets an out-of-range value. */
export function isBadgeId(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) > 0 && (value as number) <= 2147483647;
}
