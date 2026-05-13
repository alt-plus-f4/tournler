import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/tournaments/[slug]/matches
 * Fetch all matches for a tournament
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

		const matches = await db.matches.findMany({
			where: { tournamentId: tournament.id },
			include: {
				teamA: {
					select: { id: true, name: true },
				},
				teamB: {
					select: { id: true, name: true },
				},
				winner: {
					select: { id: true, name: true },
				},
			},
			orderBy: { matchDate: 'asc' },
		});

		return NextResponse.json({ matches });
	} catch (error) {
		console.error('Error fetching matches:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
