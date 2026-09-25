import { cache } from 'react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { flairMapper, playerFlairSelect } from '@/lib/helpers/player-flair';

const publicUserSelect = { id: true, name: true, image: true } as const;

/**
 * Shared (not viewer-specific) team payload, in the data cache. Roster rows carry user names,
 * avatars, Verified badges and FACEIT levels, hence 'users' alongside 'teams'. Errors propagate
 * (and so are never cached); fetchTeam turns them into null.
 */
const loadPublicTeam = cachedQuery(
	async (teamId: number) => {
		const team = await db.cs2Team.findUnique({
			where: { id: teamId },
			select: {
				id: true,
				name: true,
				game: true,
				logo: true,
				background: true,
				// bio feeds the roster hover card (public profile text).
				members: { select: { ...publicUserSelect, bio: true, ...playerFlairSelect } },
				capitan: { select: publicUserSelect },
			},
		});
		if (!team) return null;
		const withFlair = await flairMapper(team.members);
		return { team: { ...team, members: team.members.map(withFlair) } };
	},
	['team-detail'],
	{ tags: ['teams', 'users'], revalidate: REVALIDATE.standard },
);

/**
 * Public team payload for the team page, read straight from the DB (it used to round-trip through
 * GET /api/teams/[slug] over HTTP). Same shape as that endpoint: `{ team }` with only the public
 * member fields plus `verified`/`faceitLevel`. In the shared data cache, and React-cached per
 * request so generateMetadata and the page share one lookup.
 */
const fetchTeam = cache(async function fetchTeam(teamId: number) {
	if (isNaN(teamId)) return null;
	try {
		return await loadPublicTeam(teamId);
	} catch (error) {
		console.error('Error fetching team:', error);
		return null;
	}
});

export default fetchTeam;
