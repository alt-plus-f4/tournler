import type { Game } from '@prisma/client';
import TeamDrawer from '@/components/TeamDrawer';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';

/**
 * One team per game: the create button only shows while the viewer has no team in this channel.
 * Its own Suspense boundary (see the /teams page) so it never blocks the page shell or the card grid.
 */
export async function TeamsCreateSlot({ game }: { game: Game }) {
	const session = await getAuthSession();
	if (!session?.user) return null;
	const userTeams = await fetchUserTeams(session.user.id);
	if (userTeams?.[game]) return null;
	return <TeamDrawer games={[game]} defaultGame={game} />;
}
