import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { computePlayerCareerStats, getPlayerRecentMatches } from '@/lib/tournaments/player-stats';
import { NextResponse } from 'next/server';

const PUBLIC_USER_SELECT = {
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
	cs2Team: {
		select: {
			id: true,
			name: true,
			logo: true,
		},
	},
	badges: {
		orderBy: { awardedAt: 'desc' },
		select: {
			awardedAt: true,
			badge: true,
		},
	},
	createdAt: true,
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;

		if (!slug) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

		// Try to find by id first, otherwise fallback to searching by name (case-insensitive)
		let user = await db.user.findUnique({
			where: { id: slug },
			select: PUBLIC_USER_SELECT,
		});

		if (!user) {
			user = await db.user.findFirst({
				where: { name: { equals: slug, mode: 'insensitive' } },
				select: PUBLIC_USER_SELECT,
			});
		}

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const [stats, recentMatches] = await Promise.all([computePlayerCareerStats(user.id), getPlayerRecentMatches(user.id)]);

		return NextResponse.json({ user, stats, recentMatches });
	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await getAuthSession();
		const sessionUser = session?.user;

		if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		if (!(await userHasPermission(sessionUser.id, 'users:manage'))) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { slug } = await params;

		if (!slug) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

		const userId = slug;

		const user = await db.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const body = await request.json();

		const allowedFields = ['name', 'bio', 'image', 'role'] as const;
		const data: Record<string, unknown> = {};
		for (const key of allowedFields) {
			if (body[key] !== undefined) data[key] = body[key];
		}

		if (Object.keys(data).length === 0) {
			return NextResponse.json({ error: 'No valid fields to update provided' }, { status: 400 });
		}

		const updatedUser = await db.user.update({
			where: { id: userId },
			data,
		});

		return NextResponse.json(updatedUser);
	} catch (error) {
		console.error('Error updating user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
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

		const user = await db.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		await db.user.delete({
			where: { id: userId },
		});

		return NextResponse.json({ message: 'User deleted successfully' });
	} catch (error) {
		console.error('Error deleting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
