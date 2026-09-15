import { db } from '@/lib/db';

/**
 * Live, non-final round-score sync — called on every MatchZy `round_end` event so the match page
 * can show real-time score instead of only jumping when a map/series is fully decided.
 *
 * Deliberately separate from recordMatchResult/recordMapResult, which own status transitions,
 * completion, and bracket propagation: this never touches status/startedAt/pausedAt/completedAt/
 * winner, so —
 *   - a live update arriving while a match is PAUSED can't silently resume it or corrupt the
 *     elapsed-time display (see the fix in recordMatchResult for the equivalent bug there), and
 *   - a stale/reordered update can't clobber an already-decided map or match (guarded by the
 *     `status: { not: 'COMPLETED' } ` filters below — a plain no-op `updateMany` on a finished
 *     match/map is much cheaper than round-tripping through a full transaction for something
 *     that's allowed to just be dropped).
 *
 * `mapOrder` present = a bo1/bo3 series match with MatchMap rows (see finalizeVeto) — updates
 * that specific map's live score. `mapOrder` absent = a pickup match (which has no MatchMap
 * rows) — updates the aggregate `Matches` score directly, which is what the match page already
 * renders as a pickup's live score.
 */
export async function updateLiveScore(matchId: number, mapOrder: number | undefined, scoreTeamA: number, scoreTeamB: number): Promise<void> {
	if (mapOrder !== undefined) {
		await db.matchMap.updateMany({
			where: { matchId, order: mapOrder, status: { not: 'COMPLETED' } },
			data: { scoreTeamA, scoreTeamB, status: 'LIVE' },
		});
	} else {
		await db.matches.updateMany({
			where: { id: matchId, status: { not: 'COMPLETED' } },
			data: { scoreTeamA, scoreTeamB },
		});
	}
}
