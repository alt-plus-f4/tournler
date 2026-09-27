// Client-safe FACEIT helpers (pure math, no I/O). The server-side lookup lives in src/lib/faceit.ts.

// FACEIT's publicly documented Elo floor for each level (index = level; index 0 unused).
// Level 10 has no ceiling. Used to show "Elo progress toward next level" on the profile.
const LEVEL_ELO_FLOORS = [0, 100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001];

export interface FaceitLevelProgress {
	floor: number;
	ceiling: number | null; // null once at level 10 — no next level to progress toward
	percent: number; // 0-100 progress through the current level's Elo band
}

export function faceitLevelProgress(level: number, elo: number): FaceitLevelProgress {
	const floor = LEVEL_ELO_FLOORS[level] ?? 0;
	if (level >= 10) return { floor, ceiling: null, percent: 100 };
	const ceiling = LEVEL_ELO_FLOORS[level + 1] - 1;
	const percent = Math.max(0, Math.min(100, Math.round(((elo - floor) / (ceiling - floor + 1)) * 100)));
	return { floor, ceiling, percent };
}
