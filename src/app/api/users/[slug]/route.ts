import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	if (!slug) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

	const user = await db.user.findUnique({
		where: { id: slug },
		select: {
			id: true,
			name: true,
			bio: true,
			image: true,
			steam: {
				select: {
					steamId: true,
					createdAt: true,
				},
			},
			discord: {
				select: {
					discordId: true,
				},
			},
			createdAt: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	return NextResponse.json({ user });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const session = await getAuthSession();
	const sessionUser = session?.user;

	if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	if (!(await userHasPermission(sessionUser.id, 'users:manage'))) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = await params;

	if (!slug) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

	const userId = slug;

	if (!userId) {
		return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
	}

	const user = await db.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	const data = await request.json();

	const updatedUser = await db.user.update({
		where: { id: userId },
		data,
	});

	return NextResponse.json(updatedUser);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const session = await getAuthSession();
	const sessionUser = session?.user;

	if (!sessionUser) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!(await userHasPermission(sessionUser.id, 'users:manage'))) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = await params;

	if (!slug) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

	const userId = slug;

	if (!userId) {
		return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
	}

	const user = await db.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	await db.user.delete({
		where: { id: userId },
	});

	return NextResponse.json({ message: 'User deleted successfully' });
}
