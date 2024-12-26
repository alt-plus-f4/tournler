'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
	request: Request,
	{ params }: { params: { slug: string } }
) {
	const { slug } = params;

	if (!slug) {
		return NextResponse.json({ error: 'Missing User ID' }, { status: 400 });
	}

	const user = await db.user.findUnique({
		where: { id: slug },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			cs2Team: true,
			cs2TeamInvitations: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	return NextResponse.json({ user }, { status: 200 });
}
