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

export interface BuildMatchConfigOptions {
	/**
	 * Fill empty slots with bots — used only for the early "pre-warm" load
	 * (`prewarmUpcomingMatches`, ~5 minutes before the scheduled start) so players can connect and
	 * look around before everyone's ready. `bot_quota` is set explicitly either way (0 when this
	 * is off) rather than just omitted, since a *reload* of an already-loaded match (e.g. the real
	 * Start after a pre-warm) doesn't otherwise reset a cvar a previous load already changed.
	 */
	bots?: boolean;
}

/**
 * Builds MatchZy's match-config JSON (https://shobhit-pathak.github.io/MatchZy/match_setup/)
 * for a match — served by `GET /api/matches/[matchId]/game-server/match-config` and fetched by
 * the real server via `matchzy_loadmatch_url` at match-start time (see
 * `src/lib/cs2/provisioning.ts`).
 */
export async function buildMatchConfig(matchId: number, options: BuildMatchConfigOptions = {}) {
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
			// Fill with easy bots during pre-warm so the server isn't empty while players trickle
			// in early; always explicit (never omitted) so a later reload without bots actually
			// clears them instead of leaving whatever bot_quota the pre-warm load left behind.
			bot_quota: options.bots ? '5' : '0',
			bot_quota_mode: options.bots ? 'fill' : 'normal',
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
