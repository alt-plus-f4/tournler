const HANDLE_PARTS_A = ['Ace', 'Blitz', 'Nova', 'Ghost', 'Hex', 'Rift', 'Zed', 'Kilo', 'Vex', 'Rune', 'Onyx', 'Flux', 'Ember', 'Volt', 'Snap'];
const HANDLE_PARTS_B = ['Striker', 'Runner', 'Hunter', 'Wraith', 'Falcon', 'Viper', 'Reaper', 'Shade', 'Ranger', 'Blade', 'Storm', 'Fang', 'Pulse', 'Drift', 'Spark'];

function shuffled<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

export interface FakePlayer {
	name: string;
	email: string;
}

/**
 * Generates `count` fake player gamertags + unique emails for Simulate
 * Tournament team rosters. `User.email` is DB-wide unique, so each name gets
 * a distinct synthetic email regardless of display-name collisions.
 */
export function generateFakePlayers(count: number): FakePlayer[] {
	const runTag = Math.floor(Math.random() * 900000) + 100000;

	const allHandles: string[] = [];
	for (const a of HANDLE_PARTS_A) {
		for (const b of HANDLE_PARTS_B) {
			allHandles.push(`${a}${b}`);
		}
	}
	const handles = shuffled(allHandles);

	const players: FakePlayer[] = [];
	for (let i = 0; i < count; i++) {
		const cycle = Math.floor(i / handles.length);
		const suffix = cycle > 0 ? cycle + 1 : '';
		const name = `${handles[i % handles.length]}${suffix}`;
		players.push({ name, email: `sim-${runTag}-${i}@simulated.tournler.local` });
	}
	return players;
}
