import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { userHasPermission } from '@/lib/helpers/permissions';
import { computePlayerCareerStats, getPlayerRecentMatches } from '@/lib/tournaments/player-stats';
import { getFaceitInfo } from '@/lib/faceit';
import { NextResponse } from 'next/server';
import { AccountDeletionBlockedError, deleteUserAccount } from '@/lib/account';

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
	// Privacy flags, read to gate steam/discord below; only echoed back to the owner.
	showDiscord: true,
	showSteam: true,
	badges: {
		orderBy: { awardedAt: 'desc' },
		select: {
			awardedAt: true,
			// Explicit fields only: the badge row also carries timestamps that aren't public profile data.
			badge: { select: { id: true, name: true, description: true, icon: true, color: true, isOverlay: true, imageUrl: true } },
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

		// The FACEIT level is public FACEIT data, so it's looked up even when the player hides Steam.
		const [stats, recentMatches, faceit, session] = await Promise.all([
			computePlayerCareerStats(user.id),
			getPlayerRecentMatches(user.id, 20),
			user.steam ? getFaceitInfo(user.steam.steamId) : Promise.resolve(null),
			getAuthSession(),
		]);

		// Hidden linked accounts are omitted for everyone but the owner.
		const isOwner = session?.user?.id === user.id;
		const { showDiscord, showSteam, steam, discord, ...rest } = user;
		const publicUser = {
			...rest,
			steam: isOwner || showSteam ? steam : null,
			discord: isOwner || showDiscord ? discord : null,
			...(isOwner ? { showDiscord, showSteam } : {}),
		};

		return NextResponse.json({ user: publicUser, stats, recentMatches, faceit });
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

		await deleteUserAccount(userId);

		return NextResponse.json({ message: 'User deleted successfully' });
	} catch (error) {
		if (error instanceof AccountDeletionBlockedError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error deleting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
