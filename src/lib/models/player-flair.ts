/** Display data of the badge shown next to a name (Badge.showNextToName; the "Verified" badge by default), taken from the Badge row itself. */
export interface VerifiedMark {
	name: string;
	icon: string;
	color: string;
	imageUrl: string | null;
}

/** Public, per-player flair shown next to names: the next-to-name badge (field kept as `verified`) and a real FACEIT CS2 level. */
export interface PlayerFlair {
	verified: VerifiedMark | null;
	/** Real FACEIT level (src/lib/faceit.ts) — null without a linked Steam account, a FACEIT CS2 account, or FACEIT_API_KEY. */
	faceitLevel: number | null;
}
