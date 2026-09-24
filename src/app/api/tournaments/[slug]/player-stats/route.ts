import { db } from '@/lib/db';
import { computeTournamentPlayerStats } from '@/lib/tournaments/player-stats';
import { flairByUserId } from '@/lib/helpers/player-flair';
import { NextResponse } from 'next/server';

/**
 * GET /api/tournaments/[slug]/player-stats
 * Per-player leaderboard (kills/deaths/assists/K-D) aggregated across every
 * match in the tournament that has reported player stats.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		const tournamentId = Number.parseInt(slug, 10);
		const isNumericSlug = !Number.isNaN(tournamentId);

		const tournament = await db.cs2Tournament.findUnique({
			where: isNumericSlug ? { id: tournamentId } : { name: slug },
		});

		if (!tournament) {
			return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
		}

		const stats = await computeTournamentPlayerStats(tournament.id);
		// Verified badge + real FACEIT level per player (see src/lib/helpers/player-flair.ts).
		const flair = await flairByUserId(stats.map((s) => s.userId));
		return NextResponse.json({ stats: stats.map((s) => ({ ...s, verified: flair.get(s.userId)?.verified ?? null, faceitLevel: flair.get(s.userId)?.faceitLevel ?? null })) });
	} catch (error) {
		console.error('Error computing tournament player stats:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
