import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
	const url = new URL(request.url);
	const email = url.searchParams.get('email');

	if (!email) {
		return NextResponse.json(
			{ error: 'Email query parameter is required' },
			{ status: 400 }
		);
	}

	const user = await db.user.findUnique({
		where: { email },
		include: {
			cs2Team: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	if (!user.cs2Team) {
		return NextResponse.json({ msg: 'User has no team' }, { status: 200 });
	}

	return NextResponse.json({ team: user.cs2Team }, { status: 200 });
}
