import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MatchStatus, Prisma } from '@prisma/client';
import { parseGameParam } from '@/lib/games';

/**
 * GET /api/matches/public — public, paginated match listing for the /matches page.
 * Unlike GET /api/matches (the admin cross-tournament view), this requires no auth.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const statusParam = searchParams.get('status')?.trim().toUpperCase();
		const tournamentIdParam = searchParams.get('tournamentId');
		const game = parseGameParam(searchParams.get('game'));

		if (isNaN(page) || isNaN(limit)) {
			return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
		}

		let status: MatchStatus | MatchStatus[] | undefined;
		if (statusParam && statusParam !== 'ALL') {
			if (statusParam === 'LIVE') {
				// A paused match is still "in progress" from a browsing standpoint.
				status = [MatchStatus.LIVE, MatchStatus.PAUSED];
			} else if (statusParam in MatchStatus) {
				status = MatchStatus[statusParam as keyof typeof MatchStatus];
			} else {
				return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 });
			}
		}

		let tournamentId: number | undefined;
		if (tournamentIdParam) {
			tournamentId = parseInt(tournamentIdParam, 10);
			if (isNaN(tournamentId)) {
				return NextResponse.json({ error: 'Invalid tournamentId parameter' }, { status: 400 });
			}
		}

		const where: Prisma.MatchesWhereInput = {
			...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
			...(tournamentId ? { tournamentId } : {}),
			...(game ? { tournament: { game } } : {}),
		};

		const orderBy: Prisma.MatchesOrderByWithRelationInput = status === MatchStatus.SCHEDULED ? { matchDate: 'asc' } : { matchDate: 'desc' };

		const [matches, totalMatches] = await Promise.all([
			db.matches.findMany({
				where,
				orderBy,
				include: {
					tournament: { select: { id: true, name: true } },
					teamA: { select: { id: true, name: true, logo: true } },
					teamB: { select: { id: true, name: true, logo: true } },
					winner: { select: { id: true, name: true, logo: true } },
					participants: { select: { userId: true } },
				},
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.matches.count({ where }),
		]);

		return NextResponse.json({ matches, totalPages: Math.max(1, Math.ceil(totalMatches / limit)) });
	} catch (error) {
		console.error('Error fetching public matches:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
