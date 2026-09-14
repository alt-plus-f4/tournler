import { db } from '@/lib/db';
import { normalizeBestOf, getConfirmedMaps } from '@/lib/tournaments/veto';

interface RosterUser {
	id: string;
	name: string | null;
	steam: { steamId: string } | null;
}

function playersOf(users: RosterUser[]): Record<string, string> {
	return Object.fromEntries(users.filter((u) => u.steam !== null).map((u) => [u.steam!.steamId, u.name ?? u.id]));
}

/**
 * Builds MatchZy's match-config JSON (https://shobhit-pathak.github.io/MatchZy/match_setup/)
 * for a match — served by `GET /api/matches/[matchId]/game-server/match-config` and fetched by
 * the real server via `matchzy_loadmatch_url` at match-start time (see
 * `src/lib/cs2/provisioning.ts`).
 */
export async function buildMatchConfig(matchId: number) {
	const match = await db.matches.findUniqueOrThrow({
		where: { id: matchId },
		include: {
			tournament: true,
			gameServer: true,
			teamA: { include: { members: { include: { steam: true } } } },
			teamB: { include: { members: { include: { steam: true } } } },
			participants: { include: { user: { include: { steam: true } } } },
			mapActions: true,
		},
	});

	if (!match.gameServer) {
		throw new Error(`Match ${matchId} has no game server provisioned yet`);
	}

	const bestOf = normalizeBestOf(match.bestOf ?? match.tournament.bestOf);
	// Pickup matches have no map veto (see startMatch()); everything else must have completed
	// veto before this is ever called, but fall back to a single default map defensively.
	const confirmedMaps = getConfirmedMaps(match);
	const maplist = confirmedMaps.length > 0 ? confirmedMaps : [process.env.CS2_DEFAULT_MAP || 'de_dust2'];

	const team1Name = match.isPickup ? 'Side A' : (match.teamA?.name ?? 'Team A');
	const team2Name = match.isPickup ? 'Side B' : (match.teamB?.name ?? 'Team B');
	const team1Players = match.isPickup ? playersOf(match.participants.filter((p) => p.side === 'TEAM_A').map((p) => p.user)) : playersOf(match.teamA?.members ?? []);
	const team2Players = match.isPickup ? playersOf(match.participants.filter((p) => p.side === 'TEAM_B').map((p) => p.user)) : playersOf(match.teamB?.members ?? []);

	const appBaseUrl = process.env.NEXTAUTH_URL;
	const gameServerToken = process.env.GAME_SERVER_TOKEN;

	return {
		matchid: String(match.id),
		team1: { name: team1Name, players: team1Players },
		team2: { name: team2Name, players: team2Players },
		num_maps: match.isPickup ? 1 : bestOf,
		maplist,
		cvars: {
			sv_password: match.gameServer.password,
			...(appBaseUrl
				? {
						matchzy_demo_upload_url: `${appBaseUrl}/api/matches/${match.id}/demo`,
						matchzy_remote_log_url: `${appBaseUrl}/api/matches/game-state/matchzy`,
					}
				: {}),
			...(gameServerToken
				? {
						matchzy_remote_log_header_key: 'x-game-server-token',
						matchzy_remote_log_header_value: gameServerToken,
					}
				: {}),
		},
	};
}
