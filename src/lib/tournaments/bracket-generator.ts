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

	// For single elimination, we need teams to be a power of 2
	// If not, add byes or duplicate teams as needed
	let bracketTeams = sortedTeams;
	if (bracketTeams.length !== 0 && (bracketTeams.length & (bracketTeams.length - 1)) !== 0) {
		// Not a power of 2, round up to next power of 2
		const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(bracketTeams.length)));
		// Duplicate first team to fill byes (simple solution)
		const teamsCopy = [...bracketTeams];
		while (teamsCopy.length < nextPowerOf2) {
			teamsCopy.push(teamsCopy[0]);
		}
		bracketTeams = teamsCopy;
	}

	// Generate first round matches
	let position = 0;
	for (let i = 0; i < bracketTeams.length; i += 2) {
		matches.push({
			teamAId: bracketTeams[i].id,
			teamBId: bracketTeams[i + 1]?.id || bracketTeams[0].id, // Handle odd teams
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

	let bracketTeams = sortedTeams;
	if (bracketTeams.length !== 0 && (bracketTeams.length & (bracketTeams.length - 1)) !== 0) {
		const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(bracketTeams.length)));
		const teamsCopy = [...bracketTeams];
		while (teamsCopy.length < nextPowerOf2) {
			teamsCopy.push(teamsCopy[0]);
		}
		bracketTeams = teamsCopy;
	}

	// Winners bracket first round (round 1)
	let position = 0;
	for (let i = 0; i < bracketTeams.length; i += 2) {
		matches.push({
			teamAId: bracketTeams[i].id,
			teamBId: bracketTeams[i + 1]?.id || bracketTeams[0].id,
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
