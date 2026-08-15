import { Cs2Team, TournamentFormat } from '@prisma/client';

export type GeneratedBracketSlot = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
export type GeneratedMatchSlot = 'TEAM_A' | 'TEAM_B';
export type GeneratedMatchStatus = 'SCHEDULED' | 'COMPLETED';

/**
 * A single match in the in-memory bracket skeleton. `localIndex` is a
 * generation-local id (0..n-1) used to wire feeder pointers before any row
 * has a real database id; the caller maps localIndex -> db id after insert.
 */
export interface GeneratedMatch {
	localIndex: number;
	round: number;
	position: number;
	bracketSlot: GeneratedBracketSlot;
	teamAId: number | null;
	teamBId: number | null;
	status: GeneratedMatchStatus;
	winnerId: number | null;
	nextMatchLocalIndex: number | null;
	nextMatchSlot: GeneratedMatchSlot | null;
	nextLoserMatchLocalIndex: number | null;
	nextLoserMatchSlot: GeneratedMatchSlot | null;
}

function nextPowerOfTwo(n: number): number {
	let p = 1;
	while (p < n) p *= 2;
	return p;
}

/**
 * Standard recursive bracket seeding order (1-indexed seed numbers), e.g.
 * P=8 -> [1,8,4,5,2,7,3,6]. Pairing consecutive entries (0,1),(2,3),... gives
 * the textbook "1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6" round-1 draw, which is what
 * makes byes land on the top seeds instead of colliding with each other.
 */
function seedOrder(p: number): number[] {
	let seeds = [1];
	while (seeds.length < p) {
		const n = seeds.length * 2;
		const next: number[] = [];
		for (const s of seeds) {
			next.push(s, n + 1 - s);
		}
		seeds = next;
	}
	return seeds;
}

class MatchBuilder {
	matches: GeneratedMatch[] = [];

	create(partial: Pick<GeneratedMatch, 'round' | 'position' | 'bracketSlot'> & Partial<GeneratedMatch>): number {
		const localIndex = this.matches.length;
		this.matches.push({
			localIndex,
			teamAId: null,
			teamBId: null,
			status: 'SCHEDULED',
			winnerId: null,
			nextMatchLocalIndex: null,
			nextMatchSlot: null,
			nextLoserMatchLocalIndex: null,
			nextLoserMatchSlot: null,
			...partial,
		});
		return localIndex;
	}

	get(localIndex: number): GeneratedMatch {
		return this.matches[localIndex];
	}
}

/** A reference to "the winner/loser of match `sourceLocalIndex`", used to wire LB feeders before that match is known to exist as a concrete team. */
interface MatchOutcomeToken {
	sourceLocalIndex: number;
	outcome: 'winner' | 'loser';
}

function wireOutcome(builder: MatchBuilder, token: MatchOutcomeToken, targetLocalIndex: number, targetSlot: GeneratedMatchSlot) {
	const source = builder.get(token.sourceLocalIndex);
	if (token.outcome === 'winner') {
		source.nextMatchLocalIndex = targetLocalIndex;
		source.nextMatchSlot = targetSlot;
	} else {
		source.nextLoserMatchLocalIndex = targetLocalIndex;
		source.nextLoserMatchSlot = targetSlot;
	}
}

/**
 * Builds the winners-bracket rounds (shared by single- and double-elimination).
 * Teams are seeded by id ascending (a registration-order proxy — there's no
 * rating/rank data to seed by). Byes are real completed round-1 matches
 * (`teamBId: null`, winner pre-set) whose winner is wired directly into round 2.
 */
function buildWinnersBracket(builder: MatchBuilder, teams: Cs2Team[]) {
	const sortedTeams = [...teams].sort((a, b) => a.id - b.id);
	const p = nextPowerOfTwo(sortedTeams.length);
	const rounds = Math.log2(p);
	const order = seedOrder(p);
	const teamForSeed = (seed: number): number | null => (seed <= sortedTeams.length ? sortedTeams[seed - 1].id : null);

	// round -> list of localIndex, in position order
	const roundMatches: number[][] = [];

	// Round 1
	const round1: number[] = [];
	for (let i = 0; i < p / 2; i++) {
		const seedA = order[i * 2];
		const seedB = order[i * 2 + 1];
		const teamAId = teamForSeed(seedA);
		const teamBId = teamForSeed(seedB);
		const isBye = teamAId === null || teamBId === null;
		const localIndex = builder.create({
			round: 1,
			position: i,
			bracketSlot: 'WINNERS',
			teamAId,
			teamBId,
			status: isBye ? 'COMPLETED' : 'SCHEDULED',
			winnerId: isBye ? (teamAId ?? teamBId) : null,
		});
		round1.push(localIndex);
	}
	roundMatches.push(round1);

	// Rounds 2..k: empty skeletons, wired from the previous round.
	for (let r = 2; r <= rounds; r++) {
		const count = p / Math.pow(2, r);
		const thisRound: number[] = [];
		for (let pos = 0; pos < count; pos++) {
			const localIndex = builder.create({ round: r, position: pos, bracketSlot: 'WINNERS' });
			thisRound.push(localIndex);
		}
		const prevRound = roundMatches[r - 2];
		for (let pos = 0; pos < prevRound.length; pos++) {
			const feeder = builder.get(prevRound[pos]);
			const targetLocalIndex = thisRound[Math.floor(pos / 2)];
			const targetSlot: GeneratedMatchSlot = pos % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
			feeder.nextMatchLocalIndex = targetLocalIndex;
			feeder.nextMatchSlot = targetSlot;
			// A round-1 bye's winner is already known — pre-fill the next round's slot now
			// instead of waiting for the (nonexistent) match completion event.
			if (feeder.status === 'COMPLETED' && feeder.winnerId !== null) {
				const target = builder.get(targetLocalIndex);
				if (targetSlot === 'TEAM_A') target.teamAId = feeder.winnerId;
				else target.teamBId = feeder.winnerId;
			}
		}
		roundMatches.push(thisRound);
	}

	return { roundMatches, rounds };
}

/** Pairs a list of outcome tokens sequentially; an odd one out passes through unchanged (an in-bracket "bye"). */
function pairTokensSequentially(builder: MatchBuilder, tokens: MatchOutcomeToken[], round: number): { newMatches: number[]; survivors: MatchOutcomeToken[] } {
	const newMatches: number[] = [];
	const survivors: MatchOutcomeToken[] = [];
	let i = 0;
	let position = 0;
	while (i < tokens.length) {
		if (i + 1 < tokens.length) {
			const localIndex = builder.create({ round, position: position++, bracketSlot: 'LOSERS' });
			wireOutcome(builder, tokens[i], localIndex, 'TEAM_A');
			wireOutcome(builder, tokens[i + 1], localIndex, 'TEAM_B');
			newMatches.push(localIndex);
			survivors.push({ sourceLocalIndex: localIndex, outcome: 'winner' });
			i += 2;
		} else {
			survivors.push(tokens[i]);
			i += 1;
		}
	}
	return { newMatches, survivors };
}

/** Pairs equal-length survivor and freshly-dropped-loser lists positionally (survivor[i] vs loser[i]). */
function pairDropRound(builder: MatchBuilder, survivors: MatchOutcomeToken[], droppedLosers: MatchOutcomeToken[], round: number): MatchOutcomeToken[] {
	const nextSurvivors: MatchOutcomeToken[] = [];
	for (let i = 0; i < survivors.length; i++) {
		const localIndex = builder.create({ round, position: i, bracketSlot: 'LOSERS' });
		wireOutcome(builder, survivors[i], localIndex, 'TEAM_A');
		wireOutcome(builder, droppedLosers[i], localIndex, 'TEAM_B');
		nextSurvivors.push({ sourceLocalIndex: localIndex, outcome: 'winner' });
	}
	return nextSurvivors;
}

/**
 * Builds the losers bracket for double-elimination. Only WB round 1 can
 * contain byes (see buildWinnersBracket) — a bye match has no loser, so it
 * simply contributes no token to LB round 1. WB rounds 2+ always contribute
 * exactly one loser per match.
 */
function buildLosersBracket(builder: MatchBuilder, wbRoundMatches: number[][]): MatchOutcomeToken {
	let lbRound = 1;

	const round1Losers: MatchOutcomeToken[] = wbRoundMatches[0]
		.filter((localIndex) => builder.get(localIndex).status !== 'COMPLETED')
		.map((localIndex) => ({ sourceLocalIndex: localIndex, outcome: 'loser' }));

	let survivors: MatchOutcomeToken[];
	if (round1Losers.length > 0) {
		const { survivors: s } = pairTokensSequentially(builder, round1Losers, lbRound++);
		survivors = s;
	} else {
		survivors = [];
	}

	for (let wbRound = 2; wbRound <= wbRoundMatches.length; wbRound++) {
		const wbLoserTokens: MatchOutcomeToken[] = wbRoundMatches[wbRound - 1].map((localIndex) => ({ sourceLocalIndex: localIndex, outcome: 'loser' }));

		while (survivors.length > wbLoserTokens.length) {
			const { survivors: consolidated } = pairTokensSequentially(builder, survivors, lbRound++);
			survivors = consolidated;
		}

		survivors = pairDropRound(builder, survivors, wbLoserTokens, lbRound++);
	}

	if (survivors.length !== 1) {
		throw new Error(`Losers bracket construction ended with ${survivors.length} survivors, expected exactly 1`);
	}

	return survivors[0];
}

/**
 * Generate a round-robin schedule covering ALL rounds up front (classic
 * circle method) — round-robin needs no dynamic advancement since every
 * pairing is knowable at generation time. Odd team counts get a virtual bye
 * seat each round (a true "sits out", no match row, no auto-advance).
 */
export function generateRoundRobinBracket(teams: Cs2Team[]): GeneratedMatch[] {
	const builder = new MatchBuilder();
	const ids: (number | null)[] = teams.map((t) => t.id);
	if (ids.length % 2 !== 0) ids.push(null);

	const totalRounds = ids.length - 1;
	const half = ids.length / 2;
	let arr = [...ids];

	for (let round = 1; round <= totalRounds; round++) {
		let position = 0;
		for (let i = 0; i < half; i++) {
			const a = arr[i];
			const b = arr[arr.length - 1 - i];
			if (a !== null && b !== null) {
				builder.create({
					round,
					position: position++,
					bracketSlot: 'WINNERS',
					teamAId: a,
					teamBId: b,
				});
			}
		}
		const fixed = arr[0];
		const rest = arr.slice(1);
		const last = rest.pop();
		if (last !== undefined) rest.unshift(last);
		arr = [fixed, ...rest];
	}

	return builder.matches;
}

/** Single-elimination: winners bracket only, with seeded byes for non-power-of-2 team counts. */
export function generateSingleEliminationBracket(teams: Cs2Team[]): GeneratedMatch[] {
	const builder = new MatchBuilder();
	buildWinnersBracket(builder, teams);
	return builder.matches;
}

/**
 * Double-elimination: winners bracket + losers bracket + a Grand Final. By
 * fixed convention, Grand Final TEAM_A is always fed by the WB champion and
 * TEAM_B always by the LB champion — this lets the advancement engine detect
 * "did the LB side just beat the WB side" (and therefore needs a bracket
 * reset match) with no extra bookkeeping.
 */
export function generateDoubleEliminationBracket(teams: Cs2Team[]): GeneratedMatch[] {
	if (teams.length < 4) {
		throw new Error('Double-elimination requires at least 4 teams');
	}

	const builder = new MatchBuilder();
	const { roundMatches, rounds } = buildWinnersBracket(builder, teams);
	const lbChampion = buildLosersBracket(builder, roundMatches);

	const wbFinalLocalIndex = roundMatches[rounds - 1][0];
	const gfLocalIndex = builder.create({ round: 1, position: 0, bracketSlot: 'GRAND_FINAL' });
	builder.get(wbFinalLocalIndex).nextMatchLocalIndex = gfLocalIndex;
	builder.get(wbFinalLocalIndex).nextMatchSlot = 'TEAM_A';
	wireOutcome(builder, lbChampion, gfLocalIndex, 'TEAM_B');

	return builder.matches;
}

/** Dispatch to the format-specific generator. */
export function generateBracket(teams: Cs2Team[], format: TournamentFormat = TournamentFormat.SINGLE_ELIMINATION): GeneratedMatch[] {
	switch (format) {
		case TournamentFormat.ROUND_ROBIN:
			return generateRoundRobinBracket(teams);
		case TournamentFormat.DOUBLE_ELIMINATION:
			return generateDoubleEliminationBracket(teams);
		case TournamentFormat.SINGLE_ELIMINATION:
		default:
			return generateSingleEliminationBracket(teams);
	}
}
