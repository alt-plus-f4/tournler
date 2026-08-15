import { db } from '@/lib/db';
import { computeRoundRobinStandings } from '@/lib/tournaments/bracket-advancement';
import { NextResponse } from 'next/server';

/**
 * GET /api/tournaments/[slug]/standings
 * Round-robin standings (wins/losses, head-to-head tiebreak). Not meaningful
 * for elimination formats, which use the bracket tree instead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		const tournamentId = Number.parseInt(slug, 10);
		const isNumericSlug = !Number.isNaN(tournamentId);

		const tournament = await db.cs2Tournament.findUnique({
			where: isNumericSlug ? { id: tournamentId } : { name: slug },
			include: { teams: { select: { id: true, name: true, logo: true } } },
		});

		if (!tournament) {
			return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
		}

		if (tournament.format !== 'ROUND_ROBIN') {
			return NextResponse.json({ error: 'Standings are only available for round-robin tournaments' }, { status: 400 });
		}

		const standings = await computeRoundRobinStandings(tournament.id);
		const teamsById = new Map(tournament.teams.map((t) => [t.id, t]));
		const enriched = standings.map((s) => ({ ...s, team: teamsById.get(s.teamId) ?? null }));

		return NextResponse.json({ standings: enriched });
	} catch (error) {
		console.error('Error computing standings:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
