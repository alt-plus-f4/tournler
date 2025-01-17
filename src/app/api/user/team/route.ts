import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
	const url = new URL(request.url);
	const email = url.searchParams.get('email');
	const id = url.searchParams.get('id');

	if (email) {
		try {
			const userTeam = await db.user.findUnique({
				where: { email },
				include: {
					cs2Team: true,
				},
			});
			return NextResponse.json({ team: userTeam }, { status: 200 });
		} catch (err) {
			console.log('Error fetching user team:', err);
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}
	} else if (id) {
		try {
			const userTeam = await db.user.findUnique({
				where: { id },
				include: {
					cs2Team: {
						select: {
							name: true,
							id: true,
						},
					},
				},
			});
			return NextResponse.json({ team: userTeam }, { status: 200 });
		} catch (err) {
			console.log('Error fetching user team:', err);
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}
	} else {
		return NextResponse.json(
			{ error: 'Missing email or id' },
			{ status: 400 }
		);
	}
}
