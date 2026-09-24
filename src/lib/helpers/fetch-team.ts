import { cache } from 'react';
import { db } from '@/lib/db';
import { flairMapper, playerFlairSelect } from '@/lib/helpers/player-flair';

const publicUserSelect = { id: true, name: true, image: true } as const;

/**
 * Public team payload for the team page, read straight from the DB (it used to round-trip through
 * GET /api/teams/[slug] over HTTP). Same shape as that endpoint: `{ team }` with only the public
 * member fields plus `verified`/`faceitLevel`. Cached per request, so generateMetadata and the
 * page share one query.
 */
const fetchTeam = cache(async function fetchTeam(teamId: number) {
	if (isNaN(teamId)) return null;
	try {
		const team = await db.cs2Team.findUnique({
			where: { id: teamId },
			select: {
				id: true,
				name: true,
				logo: true,
				background: true,
				members: { select: { ...publicUserSelect, ...playerFlairSelect } },
				capitan: { select: publicUserSelect },
			},
		});
		if (!team) return null;
		const withFlair = await flairMapper(team.members);
		return { team: { ...team, members: team.members.map(withFlair) } };
	} catch (error) {
		console.error('Error fetching team:', error);
		return null;
	}
});

export default fetchTeam;
