import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const status = searchParams.get('status');
	const page = parseInt(searchParams.get('page') || '1', 10);
	const limit = parseInt(searchParams.get('limit') || '10', 10);

	if (isNaN(page) || isNaN(limit)) {
		return NextResponse.json(
			{ error: 'Invalid pagination parameters' },
			{ status: 400 }
		);
	}

	if (!status) {
		const tournaments = await db.cs2Tournament.findMany({
			skip: (page - 1) * limit,
			take: limit,
			include: {
				teams: true,
			},
		});
		return NextResponse.json(tournaments, { status: 200 });
	}

	if (status !== '0' && status !== '1') {
		return NextResponse.json(
			{ error: 'Invalid status parameter' },
			{ status: 400 }
		);
	}

	try {
		const tournaments = await db.cs2Tournament.findMany({
			where: {
				status: parseInt(status),
			},
			orderBy: {
				prizePool: 'desc',
			},
			include: {
				teams: true,
			},
			skip: (page - 1) * limit,
			take: limit,
		});

		return NextResponse.json(tournaments, { status: 200 });
	} catch (error) {
		console.error('Error fetching tournaments:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const formData = await req.formData();

		const name = formData.get('name')?.toString() || '';
		const startDate = formData.get('startDate')?.toString() || '';
		const endDate = formData.get('endDate')?.toString() || '';
		const prizePool = formData.get('prizePool')?.toString();
		const teamCapacity = formData.get('teamCapacity')?.toString();
		const location = formData.get('location')?.toString() || '';
		const statusValue = formData.get('status')?.toString();
		const typeValue = formData.get('type')?.toString();

		let bannerUrl: string | null = null;
		let logoUrl: string | null = null;

		const bannerFile = formData.get('bannerFile');
		if (bannerFile instanceof Blob && name) {
			const arrayBuffer = await bannerFile.arrayBuffer();
			const blob = await put(`banners/${name}-banner.png`, arrayBuffer, {
				access: 'public',
				token: process.env.BLOB_READ_WRITE_TOKEN,
			});
			bannerUrl = blob.url;
		}

		const logoFile = formData.get('logoFile');
		if (logoFile instanceof Blob && name) {
			const arrayBuffer = await logoFile.arrayBuffer();
			const blob = await put(`logos/${name}-logo.png`, arrayBuffer, {
				access: 'public',
				token: process.env.BLOB_READ_WRITE_TOKEN,
			});
			logoUrl = blob.url;
		}

		if (
			!name ||
			!startDate ||
			!endDate ||
			!teamCapacity ||
			!location ||
			statusValue === undefined ||
			typeValue === undefined
		) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		const newTournament = await db.cs2Tournament.create({
			data: {
				name,
				startDate: new Date(startDate),
				endDate: new Date(endDate),
				prizePool: prizePool ? parseInt(prizePool, 10) : null,
				teamCapacity: parseInt(teamCapacity, 10),
				location,
				bannerUrl,
				logoUrl,
				status: parseInt(statusValue, 10),
				type: parseInt(typeValue, 10),
			},
		});

		return NextResponse.json(newTournament, { status: 201 });
	} catch (error) {
		console.error('Error creating tournament:', error);
		return NextResponse.json(
			{ error: 'Failed to create tournament' },
			{ status: 500 }
		);
	}
}
