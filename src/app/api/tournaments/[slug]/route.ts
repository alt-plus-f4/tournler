import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;

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
			id: true,
			name: true,
			prizePool: true,
			teamCapacity: true,
			location: true,
			startDate: true,
			endDate: true,
			bannerUrl: true,
			logoUrl: true,
			status: true,
			type: true,
			organizer: {
				select: {
					name: true,
				},
			},
			teams: {
				select: {
					id: true,
					name: true,
					members: {
						select: {
							id: true,
							name: true,
							role: true,
							image: true,
						},
					},
				},
			},
		},
	});

	if (!tournament) {
		return NextResponse.json(
			{ error: 'Tournament not found' },
			{ status: 404 }
		);
	}

	return NextResponse.json({ tournament }, { status: 200 });
}

export async function PATCH(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	try {
		const { slug } = params;
		const numericId = parseInt(slug, 10);

		if (isNaN(numericId)) {
			return NextResponse.json(
				{ error: 'Invalid tournament ID' },
				{ status: 400 }
			);
		}

		const body = await request.json();

		if (!body || Object.keys(body).length === 0) {
			return NextResponse.json(
				{ error: 'No fields to update provided' },
				{ status: 400 }
			);
		}

		const allowedFields = [
			'name',
			'prizePool',
			'teamCapacity',
			'location',
			'startDate',
			'endDate',
			'status',
			'type',
			'bannerUrl',
			'logoUrl',
		];

		const dataToUpdate: Record<string, any> = {};
		for (const key of allowedFields) {
			if (body[key] !== undefined) {
				dataToUpdate[key] = body[key];
			}
		}

		if (Object.keys(dataToUpdate).length === 0) {
			return NextResponse.json(
				{ error: 'No valid fields to update provided' },
				{ status: 400 }
			);
		}

		const updatedTournament = await db.cs2Tournament.update({
			where: { id: numericId },
			data: dataToUpdate,
		});

		if (!updatedTournament) {
			return NextResponse.json(
				{ error: 'Tournament not found or not updated' },
				{ status: 404 }
			);
		}

		return NextResponse.json(
			{
				message: 'Tournament updated successfully',
				tournament: updatedTournament,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error updating tournament:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;

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

	const isDeleted = await db.cs2Tournament.delete({
		where: { id: numericId },
	});
	if (isDeleted)
		return NextResponse.json(
			{ message: 'Tournament deleted!' },
			{ status: 200 }
		);
	else
		return NextResponse.json(
			{ error: 'Tournament not found or other Error!' },
			{ status: 500 }
		);
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
