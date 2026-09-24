import { getAuthSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type Game } from '@prisma/client';
import { db } from '@/lib/db';
import { parseGameParam } from '@/lib/games';
import { createTeam, isGame, MembershipError } from '@/lib/teams/membership';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const parsedPage = parseInt(searchParams.get('page') || '1', 10);
	const parsedLimit = parseInt(searchParams.get('limit') || '10', 10);
	const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
	const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);
	const search = searchParams.get('search')?.trim();
	const game = parseGameParam(searchParams.get('game'));
	const where = { ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}), ...(game ? { game } : {}) };

	const teams = await db.cs2Team.findMany({
		where,
		select: {
			id: true,
			name: true,
			game: true,
			members: {
				select: {
					id: true,
					name: true,
					image: true,
					bio: true,
				},
			},
			capitanId: true,
			logo: true,
			background: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * limit,
		take: limit,
	});

	if (!teams) {
		return NextResponse.json({ error: 'Team not found' }, { status: 404 });
	}

	return NextResponse.json({ teams }, { status: 200 });
}

export async function POST(request: Request) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	const teamName = typeof body?.teamName === 'string' ? body.teamName.trim() : '';
	if (teamName.length < 3 || teamName.length > 50) return NextResponse.json({ error: 'Team name must be 3 to 50 characters' }, { status: 400 });

	// `game` is optional for old clients (they only knew CS2); anything else must be a known game.
	const game: Game | null = body?.game === undefined ? 'CS2' : isGame(body.game) ? body.game : null;
	if (!game) return NextResponse.json({ error: 'Invalid game' }, { status: 400 });

	try {
		const team = await createTeam(session.user.id, teamName, game);
		return NextResponse.json({ message: 'Team created successfully', team }, { status: 201 });
	} catch (error) {
		if (error instanceof MembershipError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
		// Unique (name, game) / (capitanId, game) caught a race the checks above didn't see.
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Team name is already taken or you already captain a team for this game', code: 'CONFLICT' }, { status: 409 });
		console.error('Failed to create team:', error);
		return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
	}
}
