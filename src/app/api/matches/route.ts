import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { Prisma } from '@prisma/client';

/**
 * GET /api/matches
 * Paginated, searchable list of matches across all tournaments — used by the
 * admin Matches page. Per-tournament match listings for public consumption
 * already exist at /api/tournaments/[slug]/matches; this is the cross-
 * tournament admin view, so it's gated on `matches:manage`.
 */
export async function GET(req: NextRequest) {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!(await userHasPermission(session.user.id, 'matches:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '10', 10);
		const search = searchParams.get('search')?.trim();

		if (isNaN(page) || isNaN(limit)) {
			return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
		}

		const where: Prisma.MatchesWhereInput | undefined = search
			? {
					OR: [{ tournament: { name: { contains: search, mode: 'insensitive' } } }, { teamA: { name: { contains: search, mode: 'insensitive' } } }, { teamB: { name: { contains: search, mode: 'insensitive' } } }],
				}
			: undefined;

		const [matches, totalMatches] = await Promise.all([
			db.matches.findMany({
				where,
				orderBy: { matchDate: 'desc' },
				include: {
					tournament: { select: { id: true, name: true } },
					teamA: { select: { id: true, name: true } },
					teamB: { select: { id: true, name: true } },
					winner: { select: { id: true, name: true } },
				},
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.matches.count({ where }),
		]);

		return NextResponse.json({ matches, totalPages: Math.ceil(totalMatches / limit) });
	} catch (error) {
		console.error('Error fetching matches:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
