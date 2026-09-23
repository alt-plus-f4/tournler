import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeEqual } from '@/lib/helpers/safe-equal';
import { MatchResultConflictError, goLiveFromServer } from '@/lib/tournaments/bracket-advancement';
import { applyGameStateUpdate } from '@/lib/tournaments/game-state';
import { updateLiveScore } from '@/lib/tournaments/live-score';

/**
 * POST /api/matches/game-state/matchzy
 *
 * Adapter for MatchZy's own event webhook (`matchzy_remote_log_url` +
 * `matchzy_remote_log_header_key`/`matchzy_remote_log_header_value`, all set per-match via
 * `cvars` — see `src/lib/cs2/match-config.ts`), translated into the same
 * `applyGameStateUpdate()` contract the direct `/api/matches/game-state` route uses, so there
 * is exactly one place that owns "what happens when a result arrives" regardless of producer.
 *
 * Field mapping verified against MatchZy's `dev` branch source (`Events.cs` / `MatchData.cs` /
 * `Utility.cs::HandleMatchEnd`), not just its docs:
 *   - `event` / `matchid` — `MatchZyEvent`/`MatchZyMatchEvent` base classes.
 *   - `winner.team` — `Winner.Team` is the literal string `"team1"`/`"team2"` (constructed as
 *     `t1score > t2score ? "team1" : "team2"`); `winner.side` is a *different* field holding the
 *     CT/T designation (`"2"`/`"3"`), not the team — do not read `.side` for this.
 *   - `map_result`: `team1`/`team2` are `MatchZyStatsTeam` objects with a `.score` field (that
 *     map's score) — `data.team1.score`/`data.team2.score` is correct here.
 *   - `series_end`: score fields are flat on the event, `team1_series_score`/
 *     `team2_series_score` (`MatchZySeriesResultEvent`), NOT nested under `team1`/`team2`.
 *   - `map_number` (`MapResultEvent.MapNumber`) is `matchConfig.CurrentMapNumber`, which is
 *     already 0-indexed (used directly as the `Maplist` array index in MatchZy) — same indexing
 *     as `MatchMap.order`, so no +/-1 adjustment belongs here.
 *   - `round_end` (`MatchZyRoundEndedEvent`) fires after every round with the same `team1`/
 *     `team2` `.score` shape as `map_result` — this is the live, in-progress round score, routed
 *     through `updateLiveScore()` (not `applyGameStateUpdate()`) since it must never touch
 *     status/winner/completion, only the score display.
 *   - `series_start` (`MatchZySeriesStartedEvent`) fires once ready-up actually completes and the
 *     series begins — routed through `goLiveFromServer()` so a match pre-warmed by
 *     `prewarmUpcomingMatches` (loaded early, before an admin clicks Start) still flips to LIVE in
 *     the app the moment it's genuinely being played, instead of sitting stale as SCHEDULED.
 * There is also a known reliability caveat with `matchzy_remote_log_*` on some setups (see
 * GitHub issue shobhit-pathak/MatchZy#369) — that's why `POST /api/matches/[matchId]/game-server/sync`
 * exists as a manual fallback, not because this adapter is expected to be unreliable by design.
 */
export async function POST(request: Request) {
	try {
		const token = request.headers.get('x-game-server-token');
		const expectedToken = process.env.GAME_SERVER_TOKEN;
		if (!token || !expectedToken || !safeEqual(token, expectedToken)) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}

		const event = (body as Record<string, unknown>).event;
		if (event !== 'map_result' && event !== 'series_end' && event !== 'round_end' && event !== 'series_start') {
			// Other MatchZy event types (player_connect, ...) carry nothing this pipeline needs.
			return NextResponse.json({ success: true, ignored: typeof event === 'string' ? event : 'unknown' });
		}

		const matchIdRaw = (body as Record<string, unknown>).matchid;
		const matchId = typeof matchIdRaw === 'string' ? Number.parseInt(matchIdRaw, 10) : Number(matchIdRaw);
		if (!matchId || Number.isNaN(matchId)) {
			return NextResponse.json({ error: 'Missing or invalid matchid' }, { status: 400 });
		}

		if (event === 'series_start') {
			await goLiveFromServer(matchId);
			return NextResponse.json({ success: true });
		}

		const match = await db.matches.findUnique({ where: { id: matchId } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const data = body as Record<string, any>;

		// Every match (pickup or bracket) now goes through veto and gets a real MatchMap row per
		// confirmed map (see finalizeVeto) — pickups aren't special-cased here anymore. MatchZy's
		// own map_number is already 0-indexed, same as MatchMap.order, for both.
		const mapNumberRaw = data.map_number;
		const mapOrder = typeof mapNumberRaw === 'number' ? mapNumberRaw : undefined;

		if (event === 'round_end') {
			// Live, in-progress round score — team1/team2.score here is the same shape as
			// map_result's (see the field-mapping comment above), just fired every round instead
			// of once at the end. Deliberately not run through applyGameStateUpdate: this must
			// never affect status/winner/completion, only the live score display.
			const teamAScore = Number(data.team1?.score ?? 0);
			const teamBScore = Number(data.team2?.score ?? 0);
			await updateLiveScore(matchId, mapOrder, teamAScore, teamBScore);
			return NextResponse.json({ success: true });
		}

		// series_end reports series-level scores flat on the event; map_result reports that map's
		// score nested under team1/team2 (see the field-mapping comment above).
		const teamAScore = Number(event === 'series_end' ? (data.team1_series_score ?? 0) : (data.team1?.score ?? 0));
		const teamBScore = Number(event === 'series_end' ? (data.team2_series_score ?? 0) : (data.team2?.score ?? 0));
		const winnerTeam = data.winner?.team as 'team1' | 'team2' | undefined;
		// Pickup matches have no Cs2Team to use as winnerId (see recordMatchResult) — use
		// winnerSide instead. Non-pickup matches use winnerId, resolved via the veto-assigned teams.
		const winnerId = !match.isPickup && winnerTeam ? ((winnerTeam === 'team1' ? match.teamAId : match.teamBId) ?? undefined) : undefined;
		const winnerSide = match.isPickup && winnerTeam ? (winnerTeam === 'team1' ? 'TEAM_A' : 'TEAM_B') : undefined;
		const isCompleted = winnerId !== undefined || winnerSide !== undefined;

		const updated = await applyGameStateUpdate({
			matchId,
			mapOrder: event === 'map_result' ? mapOrder : undefined,
			teamAScore,
			teamBScore,
			isCompleted,
			winnerId,
			winnerSide,
		});

		return NextResponse.json({ success: true, match: updated });
	} catch (error) {
		if (error instanceof MatchResultConflictError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error processing MatchZy event:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
