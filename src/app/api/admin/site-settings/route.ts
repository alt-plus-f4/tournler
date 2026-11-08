import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { SITE_SETTINGS_ID } from '@/lib/site-settings';
import { parseThemeId, themeEnumFromId, themeIdFromEnum } from '@/lib/theme';
import type { Prisma, SiteSettings } from '@prisma/client';

async function authorize() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
	}
	return { session };
}

const view = (row: SiteSettings) => ({ defaultTheme: themeIdFromEnum(row.defaultTheme), playerBadgeChoice: row.playerBadgeChoice, updatedAt: row.updatedAt });

/**
 * GET /api/admin/site-settings — the site settings singleton (created with defaults on first access).
 * PATCH /api/admin/site-settings — `{ defaultTheme?: 'mono' | 'mocha' | 'gruvbox' | 'nord' | 'rosepine',
 * playerBadgeChoice?: boolean }`. Appearance/recognition settings, so gated on `content:manage`.
 * Writes flush the `site` cache tag (root layout theme) through the Prisma extension.
 */
export async function GET() {
	const auth = await authorize();
	if (auth.error) return auth.error;
	try {
		const row = await db.siteSettings.upsert({ where: { id: SITE_SETTINGS_ID }, update: {}, create: { id: SITE_SETTINGS_ID } });
		return NextResponse.json({ settings: view(row) });
	} catch (error) {
		console.error('Error fetching site settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

	const data: Prisma.SiteSettingsUpdateInput = {};
	if (body.defaultTheme !== undefined) {
		const theme = parseThemeId(body.defaultTheme);
		if (!theme) return NextResponse.json({ error: 'defaultTheme must be one of mono, mocha, gruvbox, nord, rosepine' }, { status: 400 });
		data.defaultTheme = themeEnumFromId(theme);
	}
	if (body.playerBadgeChoice !== undefined) {
		if (typeof body.playerBadgeChoice !== 'boolean') return NextResponse.json({ error: 'playerBadgeChoice must be a boolean' }, { status: 400 });
		data.playerBadgeChoice = body.playerBadgeChoice;
	}
	if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Send defaultTheme and/or playerBadgeChoice' }, { status: 400 });

	try {
		const row = await db.siteSettings.upsert({
			where: { id: SITE_SETTINGS_ID },
			update: data,
			create: { id: SITE_SETTINGS_ID, ...(data as Prisma.SiteSettingsCreateInput) },
		});
		return NextResponse.json({ settings: view(row) });
	} catch (error) {
		console.error('Error updating site settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
