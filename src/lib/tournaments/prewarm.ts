import { db } from '@/lib/db';
import { ensureGameServer, NoAvailableGameServerError } from './game-server';
import { getVetoState } from './veto';
import { pushMatchConfigToServer } from '@/lib/cs2/provisioning';

const PREWARM_WINDOW_MS = 5 * 60 * 1000;

export interface PrewarmResult {
	matchId: number;
	success: boolean;
	error?: string;
}

/**
 * Finds SCHEDULED, non-pickup matches starting within the next 5 minutes that haven't been
 * provisioned yet, and loads them onto a real server early — config, teams, maps, and bots
 * filling empty slots — so players can connect and look around ahead of the official start.
 * `goLiveFromServer` (triggered by MatchZy's `series_start` webhook event once everyone actually
 * readies up) is what flips the match to LIVE in the app; this function only provisions and
 * loads, it never changes match status.
 *
 * Pickup matches are excluded entirely: a pickup's `matchDate` is just "whenever it was
 * created," not a real scheduled-start countdown, so pre-warming would claim a real server (and
 * fill every slot with bots) before anyone has actually joined either side — letting people
 * connect without joining, and starving other open pickups of the pool's one free server. Pickups
 * only get a server when someone actually starts them (`startMatch` -> `ensureGameServer`), by
 * which point the participants who joined via the match page are the real, final roster.
 *
 * Piggybacks on whatever already periodically hits `GET /api/tournaments/check-start` (see
 * `TOURNAMENT_GUIDE.md` — GitHub Actions every 5 minutes, or Vercel Cron) rather than adding a
 * second scheduler — that cadence is exactly what a 5-minute pre-warm window needs anyway.
 *
 * Best-effort per match: one match failing (no available server slot, RCON unreachable, veto
 * still incomplete) never blocks the others — each is caught and reported individually.
 */
export async function prewarmUpcomingMatches(): Promise<PrewarmResult[]> {
	const now = new Date();
	const windowEnd = new Date(now.getTime() + PREWARM_WINDOW_MS);

	const candidates = await db.matches.findMany({
		where: { status: 'SCHEDULED', isPickup: false, matchDate: { gte: now, lte: windowEnd } },
		include: { tournament: true, mapActions: true, gameServer: true },
	});

	const results: PrewarmResult[] = [];

	for (const match of candidates) {
		if (match.gameServer) continue; // already pre-warmed (or started) — nothing to do

		// Not ready to load yet — will be picked up on a later tick if it becomes ready
		// before matchDate passes, otherwise it just never gets pre-warmed (no harder than
		// today, where it wouldn't get a server until an admin manually starts it either).
		if (match.teamAId === null || match.teamBId === null) continue;
		const vetoState = getVetoState(match, match.tournament.mapPool, match.tournament.bestOf);
		if (vetoState.phase !== 'COMPLETE') continue;

		try {
			await ensureGameServer(db, match.id);
			await pushMatchConfigToServer(match.id, { bots: true });
			results.push({ matchId: match.id, success: true });
		} catch (error) {
			// NoAvailableGameServerError is expected/common (whole pool busy) — still logged, but
			// not alarming; anything else is worth a louder log line.
			if (!(error instanceof NoAvailableGameServerError)) {
				console.error(`Failed to pre-warm match ${match.id}:`, error);
			}
			results.push({ matchId: match.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
		}
	}

	return results;
}
