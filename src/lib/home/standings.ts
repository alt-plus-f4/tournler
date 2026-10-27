// Pure homepage helpers (no DB, no React): team ranking and week bucketing. Kept apart from
// data.ts so they can be unit tested without Prisma or Next's cache.

export type RankingTeam = { id: number; name: string; logo: string | null };

export type RankingMatch = {
	teamA: RankingTeam | null;
	teamB: RankingTeam | null;
	winnerId: number | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
};

export type RankingRow = RankingTeam & {
	played: number;
	wins: number;
	draws: number;
	losses: number;
	points: number;
};

export const POINTS_PER_WIN = 3;
export const POINTS_PER_DRAW = 1;

/**
 * Team ranking from COMPLETED team matches. A win is the recorded winnerId, or the higher score when
 * no winner was stored. Equal scores with no winner are a draw. A match with neither a winner nor a
 * full score line carries no result and is skipped. 3 points per win, 1 per draw. Sorted by points,
 * then wins, then fewer games played, then name.
 */
export function computeRanking(matches: RankingMatch[]): RankingRow[] {
	const rows = new Map<number, RankingRow>();
	const rowFor = (team: RankingTeam) => {
		let row = rows.get(team.id);
		if (!row) {
			row = { ...team, played: 0, wins: 0, draws: 0, losses: 0, points: 0 };
			rows.set(team.id, row);
		}
		return row;
	};

	for (const match of matches) {
		const { teamA, teamB } = match;
		if (!teamA || !teamB || teamA.id === teamB.id) continue;

		let winner: number | null = null;
		if (match.winnerId === teamA.id || match.winnerId === teamB.id) {
			winner = match.winnerId;
		} else if (match.scoreTeamA != null && match.scoreTeamB != null) {
			if (match.scoreTeamA > match.scoreTeamB) winner = teamA.id;
			else if (match.scoreTeamB > match.scoreTeamA) winner = teamB.id;
		} else {
			continue;
		}

		const a = rowFor(teamA);
		const b = rowFor(teamB);
		a.played += 1;
		b.played += 1;
		if (winner === null) {
			a.draws += 1;
			b.draws += 1;
			a.points += POINTS_PER_DRAW;
			b.points += POINTS_PER_DRAW;
		} else {
			const win = winner === teamA.id ? a : b;
			const loss = winner === teamA.id ? b : a;
			win.wins += 1;
			win.points += POINTS_PER_WIN;
			loss.losses += 1;
		}
	}

	return [...rows.values()].sort((x, y) => y.points - x.points || y.wins - x.wins || x.played - y.played || x.name.localeCompare(y.name));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Monday 00:00 UTC of the week containing `now`, and the following Monday (exclusive end). */
export function weekRange(now: Date): { start: Date; end: Date } {
	const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const sinceMonday = (now.getUTCDay() + 6) % 7;
	const start = new Date(midnight - sinceMonday * DAY_MS);
	return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

export type WeekMatchInput = { id: number; matchDate: Date | string };

export type WeekDay<T extends WeekMatchInput> = {
	/** 'Mon' .. 'Sun'. */
	label: string;
	/** Day of month, e.g. 27. */
	date: number;
	/** 'Oct'. */
	month: string;
	isToday: boolean;
	isWeekend: boolean;
	matches: T[];
};

/** Seven UTC days (Mon..Sun) of the week containing `now`, each with its matches in time order. */
export function bucketWeek<T extends WeekMatchInput>(matches: T[], now: Date): WeekDay<T>[] {
	const { start } = weekRange(now);
	const todayIndex = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start.getTime()) / DAY_MS);
	const days: WeekDay<T>[] = DAY_LABELS.map((label, i) => {
		const day = new Date(start.getTime() + i * DAY_MS);
		return { label, date: day.getUTCDate(), month: MONTH_LABELS[day.getUTCMonth()], isToday: i === todayIndex, isWeekend: i >= 5, matches: [] };
	});

	const sorted = [...matches].sort((x, y) => new Date(x.matchDate).getTime() - new Date(y.matchDate).getTime() || x.id - y.id);
	for (const match of sorted) {
		const index = Math.floor((new Date(match.matchDate).getTime() - start.getTime()) / DAY_MS);
		if (index >= 0 && index < 7) days[index].matches.push(match);
	}
	return days;
}

/** ISO week number (1..53) of the UTC date `now`, for the "Week 44" eyebrow. */
export function isoWeekNumber(now: Date): number {
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
	return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}
