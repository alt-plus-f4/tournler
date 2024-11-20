import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	const session = await getAuthSession();

	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await db.user.findUnique({
		where: { email: session?.user?.email || '' },
		select: {
			name: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	const hasname = !!user.name;
	return NextResponse.json({ hasname }, { status: 200 });
}

export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const user = await db.user.findUnique({
		where: { email: session?.user?.email || '' },
	});

	if (!user)
		return NextResponse.json({ error: 'User not found' }, { status: 404 });

	const { name } = await request.json();

	if (!name || typeof name !== 'string')
		return NextResponse.json(
			{ error: 'Invalid name' },
			{ status: 400 }
		);

	await db.user.update({
		where: { email: session.user.email || '' },
		data: { name },
	});

	return NextResponse.json(
		{ message: 'name updated successfully' },
		{ status: 200 }
	);
}
