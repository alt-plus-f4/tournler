import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;
	const url = new URL(request.url);
	const teamId = url.searchParams.get('teamId');

	if (!slug) {
		return NextResponse.json(
			{ error: 'Missing tournament ID' },
			{ status: 400 }
		);
	}

	const numericId = parseInt(slug, 10);

	if (isNaN(numericId)) {
		return NextResponse.json(
			{ error: 'Invalid tournament ID' },
			{ status: 400 }
		);
	}

	const tournament = await db.cs2Tournament.findUnique({
		where: { id: numericId },
		select: {
			teams: true,
		},
	});

	if (!tournament) {
		return NextResponse.json(
			{ error: 'Tournament not found' },
			{ status: 404 }
		);
	}

	if (teamId) {
		const teamInTournament = tournament.teams.some(
			(team) => team.id === parseInt(teamId, 10)
		);
		return NextResponse.json({ teamInTournament }, { status: 200 });
	}

	return NextResponse.json({ teams: tournament.teams }, { status: 200 });
}

export async function DELETE(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	try {
		const tournamentId = parseInt(params.slug, 10);
		const { teamId } = await request.json();

		if (isNaN(tournamentId) || !teamId) {
			return NextResponse.json(
				{ error: 'Invalid tournamentId or missing teamId' },
				{ status: 400 }
			);
		}

		const tournament = await db.cs2Tournament.findUnique({
			where: { id: tournamentId },
		});

		if (!tournament) {
			return NextResponse.json(
				{ error: 'Tournament not found' },
				{ status: 404 }
			);
		}

		const team = await db.cs2Team.findUnique({
			where: { id: teamId },
		});

		if (!team) {
			return NextResponse.json(
				{ error: 'Team not found' },
				{ status: 404 }
			);
		}

		await db.cs2Tournament.update({
			where: { id: tournamentId },
			data: {
				teams: {
					disconnect: { id: teamId },
				},
			},
		});

		return NextResponse.json(
			{ message: 'Team removed from tournament successfully' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error removing team from tournament:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	try {
		const tournamentId = parseInt(params.slug, 10);
		const { teamId } = await request.json();

		if (isNaN(tournamentId) || !teamId) {
			return NextResponse.json(
				{ error: 'Invalid tournamentId or missing teamId' },
				{ status: 400 }
			);
		}

		const tournament = await db.cs2Tournament.findUnique({
			where: { id: tournamentId },
			select: {
				teams: true,
				teamCapacity: true,
			},
		});

		if (!tournament) {
			return NextResponse.json(
				{ error: 'Tournament not found' },
				{ status: 404 }
			);
		}

		if (tournament.teams.length >= tournament.teamCapacity) {
			return NextResponse.json(
				{ error: 'Tournament is full' },
				{ status: 400 }
			);
		}

		const team = await db.cs2Team.findUnique({
			where: { id: teamId },
		});

		if (!team) {
			return NextResponse.json(
				{ error: 'Team not found' },
				{ status: 404 }
			);
		}

		await db.cs2Tournament.update({
			where: { id: tournamentId },
			data: {
				teams: {
					connect: { id: teamId },
				},
			},
		});

		return NextResponse.json(
			{ message: 'Team added to tournament successfully' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error adding team to tournament:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
