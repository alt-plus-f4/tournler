import { getAuthSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const page = parseInt(searchParams.get('page') || '1', 10);
	const limit = parseInt(searchParams.get('limit') || '10', 10);

	let teams = null;

	if (isNaN(page) || isNaN(limit)) {
		teams = await db.cs2Team.findMany({
			select: {
				id: true,
				name: true,
				members: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
				capitanId: true,
				logo: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!teams) 
			return NextResponse.json({ error: 'Team not found' }, { status: 404 });
		
		return NextResponse.json({ teams }, { status: 200 });
	}

	teams = await db.cs2Team.findMany({
		select: {
			id: true,
			name: true,
			members: {
				select: {
					id: true,
					name: true,
					image: true,
				},
			},
			capitanId: true,
			logo: true,
			createdAt: true,
			updatedAt: true,
		},
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
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { teamName } = await request.json();

	if (!teamName || typeof teamName !== 'string')
		return NextResponse.json(
			{ error: 'Invalid team name' },
			{ status: 400 }
		);

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		include: {
			cs2Team: true,
			cs2TeamCaptain: true,
		},
	});

	if (!user)
		return NextResponse.json({ error: 'User not found' }, { status: 404 });

	if (user.cs2Team || user.cs2TeamCaptain) {
		return NextResponse.json(
			{ error: 'User is already in a team' },
			{ status: 400 }
		);
	}

	const existingTeam = await db.cs2Team.findUnique({
		where: { name: teamName },
	});

	if (existingTeam) {
		return NextResponse.json(
			{ error: 'Team name is already taken' },
			{ status: 409 }
		);
	}

	try {
		const team = await db.cs2Team.create({
			data: {
				name: teamName,
				members: {
					connect: { id: session.user.id },
				},
				capitan: {
					connect: { id: session.user.id },
				},
			},
		});

		return NextResponse.json(
			{ message: 'Team created successfully', team },
			{ status: 201 }
		);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to create team: ' + error },
			{ status: 500 }
		);
	}
}
