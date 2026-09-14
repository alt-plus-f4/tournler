import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeEqual } from '@/lib/helpers/safe-equal';
import { MatchResultConflictError } from '@/lib/tournaments/bracket-advancement';
import { applyGameStateUpdate } from '@/lib/tournaments/game-state';

/**
 * POST /api/matches/game-state/matchzy
 *
 * Adapter for MatchZy's own event webhook (`matchzy_remote_log_url` +
 * `matchzy_remote_log_header_key`/`matchzy_remote_log_header_value`, all set per-match via
 * `cvars` — see `src/lib/cs2/match-config.ts`), translated into the same
 * `applyGameStateUpdate()` contract the direct `/api/matches/game-state` route uses, so there
 * is exactly one place that owns "what happens when a result arrives" regardless of producer.
 *
 * CAVEAT: the JSON field names read below (`event`, `matchid`, `map_number`, `team1`/`team2`
 * scores, `winner.side`) are inferred from MatchZy's public docs and `Events.cs` event type
 * names (`map_result`, `series_end`) and have NOT been verified against a live server response
 * for the MatchZy version `cs-docker/settings/pre.sh` installs — treat this as a best-effort
 * mapping and adjust the field lookups here once real payloads are captured. There is also a
 * known reliability caveat with `matchzy_remote_log_*` on some setups (see GitHub issue
 * shobhit-pathak/MatchZy#369) — that's why `POST /api/matches/[matchId]/game-server/sync`
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
		if (event !== 'map_result' && event !== 'series_end') {
			// round_end and other MatchZy event types carry nothing this pipeline needs.
			return NextResponse.json({ success: true, ignored: typeof event === 'string' ? event : 'unknown' });
		}

		const matchIdRaw = (body as Record<string, unknown>).matchid;
		const matchId = typeof matchIdRaw === 'string' ? Number.parseInt(matchIdRaw, 10) : Number(matchIdRaw);
		if (!matchId || Number.isNaN(matchId)) {
			return NextResponse.json({ error: 'Missing or invalid matchid' }, { status: 400 });
		}

		const match = await db.matches.findUnique({ where: { id: matchId } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const data = body as Record<string, any>;
		const teamAScore = Number(data.team1?.score ?? 0);
		const teamBScore = Number(data.team2?.score ?? 0);
		const winnerSide = data.winner?.side as 'team1' | 'team2' | undefined;
		const winnerId = winnerSide === 'team1' ? (match.teamAId ?? undefined) : winnerSide === 'team2' ? (match.teamBId ?? undefined) : undefined;

		// MatchZy's map_number is expected to be 1-indexed (Get5-compatible convention); MatchMap.order is 0-indexed.
		const mapNumberRaw = data.map_number;
		const mapOrder = event === 'map_result' && typeof mapNumberRaw === 'number' ? mapNumberRaw - 1 : undefined;

		const updated = await applyGameStateUpdate({
			matchId,
			mapOrder,
			teamAScore,
			teamBScore,
			isCompleted: winnerId !== undefined,
			winnerId,
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
