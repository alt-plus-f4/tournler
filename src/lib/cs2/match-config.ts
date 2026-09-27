import { db } from '@/lib/db';
import { normalizeBestOf, getConfirmedMaps } from '@/lib/tournaments/veto';
import { gameServerCallbackUrl } from './callback-url';
import { assertHostsGameServers } from '@/lib/tournaments/game-rules';

interface RosterUser {
	id: string;
	name: string | null;
	steam: { steamId: string } | null;
}

// team1/team2.players below isn't just a display roster — MatchZy enforces it as a hard whitelist
// the moment a match JSON is loaded: any connecting SteamID that isn't listed gets kicked
// immediately ("NOT ALLOWED!"), and per shobhit-pathak/MatchZy#372 this is mandatory rather than
// something `matchzy_kick_invalid_players`/`matchzy_whitelist_enabled_default` can turn off once a
// match is active. So restricting the server to "only SteamIDs that joined through the match
// page" needs no RCON-side enforcement of our own — it falls out of populating this correctly
// (pickup participants for pickups, real team members otherwise), which playersOf already does.
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

	assertHostsGameServers(match.tournament.game, 'build a MatchZy config for');

	if (!match.gameServer) {
		throw new Error(`Match ${matchId} has no game server provisioned yet`);
	}

	const bestOf = normalizeBestOf(match.bestOf ?? match.tournament.bestOf);
	// Every match (pickup or bracket) must have completed veto before this is ever called (see
	// startMatch()) — the CS2_DEFAULT_MAP fallback below is just defensive, not the normal path.
	const confirmedMaps = getConfirmedMaps(match);
	const maplist = confirmedMaps.length > 0 ? confirmedMaps : [process.env.CS2_DEFAULT_MAP || 'de_dust2'];

	const team1Name = match.isPickup ? 'Side A' : (match.teamA?.name ?? 'Team A');
	const team2Name = match.isPickup ? 'Side B' : (match.teamB?.name ?? 'Team B');
	const team1Players = match.isPickup ? playersOf(match.participants.filter((p) => p.side === 'TEAM_A').map((p) => p.user)) : playersOf(match.teamA?.members ?? []);
	const team2Players = match.isPickup ? playersOf(match.participants.filter((p) => p.side === 'TEAM_B').map((p) => p.user)) : playersOf(match.teamB?.members ?? []);

	const appBaseUrl = gameServerCallbackUrl();
	const gameServerToken = process.env.GAME_SERVER_TOKEN;

	return {
		matchid: String(match.id),
		team1: { name: team1Name, players: team1Players },
		team2: { name: team2Name, players: team2Players },
		num_maps: bestOf,
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
