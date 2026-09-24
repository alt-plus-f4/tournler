import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getOrCreatePickupTournament } from '@/lib/tournaments/pickup';
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
					tournament: { select: { id: true, name: true, game: true } },
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

/**
 * POST /api/matches — manually create a standalone match, for testing the live-match/
 * game-server flow without waiting for a full tournament bracket to generate one.
 * Not wired into bracket auto-advancement (nextMatchId/nextMatchSlot left null).
 */
export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'matches:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { tournamentId, teamAId, teamBId, matchDate, isPickup, bestOf, pickupMode } = body;

		if (!matchDate) {
			return NextResponse.json({ error: 'matchDate is required' }, { status: 400 });
		}
		const parsedDate = new Date(matchDate);
		if (isNaN(parsedDate.getTime())) {
			return NextResponse.json({ error: 'Invalid matchDate' }, { status: 400 });
		}

		if (isPickup) {
			if (bestOf !== undefined && bestOf !== 1 && bestOf !== 3) {
				return NextResponse.json({ error: 'bestOf must be 1 or 3' }, { status: 400 });
			}
			if (pickupMode !== undefined && pickupMode !== 'OPEN' && pickupMode !== 'CAPTAIN_DRAFT') {
				return NextResponse.json({ error: 'pickupMode must be OPEN or CAPTAIN_DRAFT' }, { status: 400 });
			}

			const pickupTournament = await getOrCreatePickupTournament(session.user.id);
			const round = 1;
			const position = await db.matches.count({ where: { tournamentId: pickupTournament.id, round } });

			const match = await db.matches.create({
				data: {
					tournamentId: pickupTournament.id,
					matchDate: parsedDate,
					status: 'SCHEDULED',
					round,
					position,
					bracketSlot: 'WINNERS',
					isPickup: true,
					bestOf: bestOf ?? 1,
					pickupMode: pickupMode ?? 'OPEN',
				},
				include: {
					tournament: { select: { id: true, name: true } },
					teamA: { select: { id: true, name: true, logo: true } },
					teamB: { select: { id: true, name: true, logo: true } },
					winner: { select: { id: true, name: true, logo: true } },
					participants: { include: { user: { select: { id: true, name: true, image: true } } } },
				},
			});

			return NextResponse.json({ match }, { status: 201 });
		}

		if (!tournamentId || !teamAId || !teamBId) {
			return NextResponse.json({ error: 'tournamentId, teamAId, teamBId, and matchDate are required' }, { status: 400 });
		}
		if (teamAId === teamBId) {
			return NextResponse.json({ error: 'Team A and Team B must be different teams' }, { status: 400 });
		}

		const [tournament, teamA, teamB] = await Promise.all([
			db.cs2Tournament.findUnique({ where: { id: tournamentId }, select: { id: true, game: true } }),
			db.cs2Team.findUnique({ where: { id: teamAId }, select: { id: true, game: true } }),
			db.cs2Team.findUnique({ where: { id: teamBId }, select: { id: true, game: true } }),
		]);

		if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
		if (!teamA || !teamB) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
		if (teamA.game !== tournament.game || teamB.game !== tournament.game) {
			return NextResponse.json({ error: 'Both teams must play the tournament’s game' }, { status: 400 });
		}

		const round = 1;
		const position = await db.matches.count({ where: { tournamentId, round } });

		const match = await db.matches.create({
			data: {
				tournamentId,
				teamAId,
				teamBId,
				matchDate: parsedDate,
				status: 'SCHEDULED',
				round,
				position,
				bracketSlot: 'WINNERS',
			},
			include: {
				tournament: { select: { id: true, name: true } },
				teamA: { select: { id: true, name: true, logo: true } },
				teamB: { select: { id: true, name: true, logo: true } },
				winner: { select: { id: true, name: true, logo: true } },
			},
		});

		return NextResponse.json({ match }, { status: 201 });
	} catch (error) {
		console.error('Error creating match:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
