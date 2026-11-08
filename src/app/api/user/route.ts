import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountDeletionBlockedError, deleteUserAccount } from '@/lib/account';
import { getSiteSettings } from '@/lib/site-settings';
import { isBadgeId } from '@/lib/badges/placement';
import { parseThemeId, themeEnumFromId, themeIdFromEnum, THEME_COOKIE, THEME_COOKIE_MAX_AGE } from '@/lib/theme';
import type { Prisma } from '@prisma/client';

export async function GET() {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user?.id;
		const email = session.user?.email || '';

		let user = null;
		if (userId) {
			user = await db.user.findUnique({
				where: { id: userId },
				include: { discord: true, steam: true },
			});
		}

		if (!user && email) {
			user = await db.user.findUnique({
				where: { email },
				include: { discord: true, steam: true },
			});
		}

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ user }, { status: 200 });
	} catch (error) {
		console.error('Error fetching current user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

const VISIBILITY_FIELDS = ['showDiscord', 'showSteam', 'showRiot'] as const;

/**
 * Self-service profile preferences. Always acts on the session user, so only the profile owner can
 * change their own settings. Any combination of:
 * - `showDiscord` / `showSteam` / `showRiot`: boolean privacy flags for linked accounts;
 * - `theme`: a theme id (`mono`, `mocha`, `gruvbox`, `nord`, `rosepine`) or `null` to follow the site
 *   default. Also sets/clears the `tournler-theme` cookie the root layout applies before first paint;
 * - `avatarBadgeId`: id of an awarded badge allowed on avatars (Badge.showOnAvatar), or `null` for
 *   automatic. 403 while the site doesn't allow player badge choice (SiteSettings.playerBadgeChoice).
 */
export async function PATCH(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
	}

	const data: Prisma.UserUpdateInput = {};
	for (const key of VISIBILITY_FIELDS) {
		if (body[key] === undefined) continue;
		if (typeof body[key] !== 'boolean') return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
		data[key] = body[key];
	}

	let theme: ReturnType<typeof parseThemeId> | undefined;
	if (body.theme !== undefined) {
		theme = body.theme === null ? null : parseThemeId(body.theme);
		if (body.theme !== null && !theme) return NextResponse.json({ error: 'theme must be one of mono, mocha, gruvbox, nord, rosepine, or null' }, { status: 400 });
		data.theme = theme ? themeEnumFromId(theme) : null;
	}

	const badgeId = body.avatarBadgeId;
	if (badgeId !== undefined && badgeId !== null && !isBadgeId(badgeId)) return NextResponse.json({ error: 'avatarBadgeId must be a badge id or null' }, { status: 400 });

	if (badgeId === undefined && Object.keys(data).length === 0) {
		return NextResponse.json({ error: 'Send showDiscord, showSteam, showRiot, theme and/or avatarBadgeId' }, { status: 400 });
	}

	try {
		if (badgeId !== undefined) {
			if (!(await getSiteSettings()).playerBadgeChoice) return NextResponse.json({ error: 'Choosing your avatar badge is turned off' }, { status: 403 });
			if (badgeId !== null) {
				const award = await db.userBadge.findUnique({ where: { userId_badgeId: { userId: session.user.id, badgeId } }, select: { badge: { select: { showOnAvatar: true } } } });
				if (!award) return NextResponse.json({ error: 'You don’t have that badge' }, { status: 400 });
				if (!award.badge.showOnAvatar) return NextResponse.json({ error: 'That badge can’t be shown on avatars' }, { status: 400 });
			}
			data.avatarBadge = badgeId === null ? { disconnect: true } : { connect: { id: badgeId } };
		}

		const user = await db.user.update({
			where: { id: session.user.id },
			data,
			select: { showDiscord: true, showSteam: true, showRiot: true, theme: true, avatarBadgeId: true },
		});
		const { theme: storedTheme, avatarBadgeId, ...visibility } = user;
		const response = NextResponse.json({ visibility, theme: themeIdFromEnum(storedTheme), avatarBadgeId });
		if (theme !== undefined) {
			if (theme) response.cookies.set(THEME_COOKIE, theme, { path: '/', maxAge: THEME_COOKIE_MAX_AGE, sameSite: 'lax' });
			else response.cookies.delete(THEME_COOKIE);
		}
		return response;
	} catch (error) {
		console.error('Error updating profile visibility:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** Self-service account deletion (GDPR erasure). Body must be `{ "confirm": "DELETE" }`. */
export async function DELETE(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (body?.confirm !== 'DELETE') {
		return NextResponse.json({ error: 'Confirm by sending { "confirm": "DELETE" }' }, { status: 400 });
	}

	try {
		const deleted = await deleteUserAccount(session.user.id);
		if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 });
		return NextResponse.json({ message: 'Account deleted' });
	} catch (error) {
		if (error instanceof AccountDeletionBlockedError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		console.error('Error deleting own account:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
