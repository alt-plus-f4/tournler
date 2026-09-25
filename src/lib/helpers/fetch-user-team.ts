import { cache } from 'react';
import type { Game } from '@prisma/client';
import { getUserTeams, type UserTeamsByGame } from '@/lib/teams/membership';

/**
 * The user's teams, one per game (`{ CS2: team | null, LOL: team | null }`), read directly from the
 * DB rather than via GET /api/user/team over HTTP. Cached per request; null on a DB error.
 */
export const fetchUserTeams = cache(async function fetchUserTeams(userId: string): Promise<UserTeamsByGame | null> {
	try {
		return await getUserTeams(userId);
	} catch {
		return null;
	}
});

/**
 * The team a user plays for in one game (`{ team: { id, name, game, ... } | null }`). Defaults to
 * CS2 for callers written before teams were per game; pass the tournament's/page's game instead.
 */
export const fetchUserTeam = cache(async function fetchUserTeam(userId: string, game: Game = 'CS2') {
	const teams = await fetchUserTeams(userId);
	return teams ? { team: teams[game] } : null;
});
