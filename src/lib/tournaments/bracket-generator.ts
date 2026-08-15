import { Cs2Team } from '@prisma/client';

export interface BracketMatch {
	teamAId: number;
	teamBId: number;
	round: number;
	position: number;
}

/**
 * Generate a round-robin tournament bracket
 * Each team plays every other team once
 */
export function generateRoundRobinBracket(teams: Cs2Team[]): BracketMatch[] {
	const matches: BracketMatch[] = [];
	let position = 0;

	// Create matches where each team plays every other team
	for (let i = 0; i < teams.length; i++) {
		for (let j = i + 1; j < teams.length; j++) {
			matches.push({
				teamAId: teams[i].id,
				teamBId: teams[j].id,
				round: 1,
				position: position++,
			});
		}
	}

	return matches;
}

/**
 * Generate a single-elimination tournament bracket
 * Teams are paired off and losers are eliminated
 */
export function generateSingleEliminationBracket(teams: Cs2Team[]): BracketMatch[] {
	const matches: BracketMatch[] = [];

	// Sort teams to ensure consistent seeding
	const sortedTeams = [...teams].sort((a, b) => a.id - b.id);

	// For an odd number of teams, the last team gets a bye (no round-1 match)
	// rather than being paired against a duplicate of another team.
	let position = 0;
	for (let i = 0; i < sortedTeams.length - 1; i += 2) {
		matches.push({
			teamAId: sortedTeams[i].id,
			teamBId: sortedTeams[i + 1].id,
			round: 1,
			position: position++,
		});
	}

	return matches;
}

/**
 * Generate a double-elimination tournament bracket
 * Teams play in winners and losers brackets
 */
export function generateDoubleEliminationBracket(teams: Cs2Team[]): BracketMatch[] {
	const matches: BracketMatch[] = [];
	const sortedTeams = [...teams].sort((a, b) => a.id - b.id);

	// For an odd number of teams, the last team gets a bye (no round-1 match)
	// rather than being paired against a duplicate of another team.
	let position = 0;
	for (let i = 0; i < sortedTeams.length - 1; i += 2) {
		matches.push({
			teamAId: sortedTeams[i].id,
			teamBId: sortedTeams[i + 1].id,
			round: 1,
			position: position++,
		});
	}

	// Note: Losers bracket matches would be generated dynamically based on winners bracket results
	return matches;
}

/**
 * Choose bracket type and generate
 */
export function generateBracket(teams: Cs2Team[], type: 'round-robin' | 'single-elimination' | 'double-elimination' = 'single-elimination'): BracketMatch[] {
	switch (type) {
		case 'round-robin':
			return generateRoundRobinBracket(teams);
		case 'double-elimination':
			return generateDoubleEliminationBracket(teams);
		case 'single-elimination':
		default:
			return generateSingleEliminationBracket(teams);
	}
}
