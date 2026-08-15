import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	if (!slug) {
		return NextResponse.json({ error: 'Missing tournament ID' }, { status: 400 });
	}

	const numericId = parseInt(slug, 10);

	if (isNaN(numericId)) {
		return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
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
		return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
	}

	return NextResponse.json({ tournament }, { status: 200 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		const numericId = parseInt(slug, 10);

		if (isNaN(numericId)) {
			return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
		}

		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const existingTournament = await db.cs2Tournament.findUnique({ where: { id: numericId }, select: { organizerId: true } });
		if (!existingTournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

		const canManage = existingTournament.organizerId === session.user.id || (await userHasPermission(session.user.id, 'tournaments:manage'));
		if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

		const body = await request.json();

		if (!body || Object.keys(body).length === 0) {
			return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
		}

		const allowedFields = ['name', 'prizePool', 'teamCapacity', 'location', 'startDate', 'endDate', 'status', 'type', 'bannerUrl', 'logoUrl'];

		const dataToUpdate: Record<string, any> = {};
		for (const key of allowedFields) {
			if (body[key] !== undefined) {
				dataToUpdate[key] = body[key];
			}
		}

		if (Object.keys(dataToUpdate).length === 0) {
			return NextResponse.json({ error: 'No valid fields to update provided' }, { status: 400 });
		}

		// Coerce/validate certain field types for Prisma
		if (dataToUpdate.startDate !== undefined) {
			if (typeof dataToUpdate.startDate === 'string') {
				const parsed = new Date(dataToUpdate.startDate);
				if (isNaN(parsed.getTime())) {
					// try ISO date-only -> append midnight UTC
					const alt = new Date(dataToUpdate.startDate + 'T00:00:00Z');
					if (isNaN(alt.getTime())) {
						return NextResponse.json({ error: 'Invalid startDate format, expected ISO-8601' }, { status: 400 });
					}
					dataToUpdate.startDate = alt;
				} else {
					dataToUpdate.startDate = parsed;
				}
			} else if (!(dataToUpdate.startDate instanceof Date)) {
				return NextResponse.json({ error: 'startDate must be a valid date' }, { status: 400 });
			}
		}

		if (dataToUpdate.endDate !== undefined) {
			if (typeof dataToUpdate.endDate === 'string') {
				const parsed = new Date(dataToUpdate.endDate);
				if (isNaN(parsed.getTime())) {
					const alt = new Date(dataToUpdate.endDate + 'T00:00:00Z');
					if (isNaN(alt.getTime())) {
						return NextResponse.json({ error: 'Invalid endDate format, expected ISO-8601' }, { status: 400 });
					}
					dataToUpdate.endDate = alt;
				} else {
					dataToUpdate.endDate = parsed;
				}
			} else if (!(dataToUpdate.endDate instanceof Date)) {
				return NextResponse.json({ error: 'endDate must be a valid date' }, { status: 400 });
			}
		}

		if (dataToUpdate.prizePool !== undefined) {
			const n = Number(dataToUpdate.prizePool);
			if (Number.isNaN(n)) {
				return NextResponse.json({ error: 'prizePool must be a number' }, { status: 400 });
			}
			dataToUpdate.prizePool = n;
		}

		if (dataToUpdate.teamCapacity !== undefined) {
			const n = Number(dataToUpdate.teamCapacity);
			if (!Number.isInteger(n)) {
				return NextResponse.json({ error: 'teamCapacity must be an integer' }, { status: 400 });
			}
			dataToUpdate.teamCapacity = n;
		}

		const updatedTournament = await db.cs2Tournament.update({
			where: { id: numericId },
			data: dataToUpdate,
		});

		if (!updatedTournament) {
			return NextResponse.json({ error: 'Tournament not found or not updated' }, { status: 404 });
		}

		return NextResponse.json(
			{
				message: 'Tournament updated successfully',
				tournament: updatedTournament,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error('Error updating tournament:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	if (!slug) {
		return NextResponse.json({ error: 'Missing tournament ID' }, { status: 400 });
	}

	const numericId = parseInt(slug, 10);

	if (isNaN(numericId)) {
		return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
	}

	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const existingTournament = await db.cs2Tournament.findUnique({ where: { id: numericId }, select: { organizerId: true } });
	if (!existingTournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

	const canManage = existingTournament.organizerId === session.user.id || (await userHasPermission(session.user.id, 'tournaments:manage'));
	if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

	try {
		await db.cs2Tournament.delete({ where: { id: numericId } });
		return NextResponse.json({ message: 'Tournament deleted!' }, { status: 200 });
	} catch (error) {
		console.error('Error deleting tournament:', error);
		return NextResponse.json({ error: 'Cannot delete tournament while teams are still registered. Remove its teams first.' }, { status: 409 });
	}
}
