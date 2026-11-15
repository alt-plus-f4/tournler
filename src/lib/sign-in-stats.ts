import 'server-only';
import { getNavData } from '@/lib/hub/data';
import type { SignInStats } from '@/components/SignIn';

/** Teams and open tournaments across both games, from the header's cached counts. Null if the DB is unreachable. */
export async function loadSignInStats(): Promise<SignInStats | null> {
	try {
		const { games } = await getNavData();
		return {
			teams: games.CS2.teams + games.LOL.teams,
			openTournaments: games.CS2.openTournaments + games.LOL.openTournaments,
		};
	} catch (error) {
		console.error('Sign-in stats failed to load:', error);
		return null;
	}
}
