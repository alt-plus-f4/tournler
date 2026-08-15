import { db } from '@/lib/db';
import { computeTournamentPlayerStats } from '@/lib/tournaments/player-stats';
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
		return NextResponse.json({ stats });
	} catch (error) {
		console.error('Error computing tournament player stats:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
