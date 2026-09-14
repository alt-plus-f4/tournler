const ADJECTIVES = ['Crimson', 'Shadow', 'Phantom', 'Silent', 'Frozen', 'Rogue', 'Savage', 'Iron', 'Toxic', 'Radiant', 'Feral', 'Ghost', 'Rapid', 'Golden', 'Void', 'Blazing', 'Grim', 'Wild', 'Arctic', 'Vicious'];
const NOUNS = ['Wolves', 'Ravens', 'Titans', 'Vipers', 'Falcons', 'Reapers', 'Panthers', 'Hydras', 'Scorpions', 'Sentinels', 'Marauders', 'Cobras', 'Griffins', 'Outlaws', 'Nomads', 'Warlords', 'Specters', 'Jaguars', 'Vandals', 'Renegades'];

function shuffled<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/**
 * Generates `count` team names, unique within this call and (via the run
 * tag) across repeated simulation runs — `Cs2Team.name` has a DB-wide unique
 * constraint. Tagged "(Sim ####)" so simulated teams are easy to spot.
 */
export function generateFakeTeamNames(count: number): string[] {
	const runTag = Math.floor(Math.random() * 9000) + 1000;

	const allPairs: string[] = [];
	for (const adjective of ADJECTIVES) {
		for (const noun of NOUNS) {
			allPairs.push(`${adjective} ${noun}`);
		}
	}
	const pairs = shuffled(allPairs);

	const names: string[] = [];
	for (let i = 0; i < count; i++) {
		const cycle = Math.floor(i / pairs.length);
		const suffix = cycle > 0 ? ` ${cycle + 1}` : '';
		names.push(`${pairs[i % pairs.length]}${suffix} (Sim ${runTag})`);
	}
	return names;
}
