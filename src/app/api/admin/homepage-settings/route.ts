import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { FeaturedLayout, FeaturedSource } from '@prisma/client';

const SETTINGS_ID = 1;

/**
 * GET /api/admin/homepage-settings — read the singleton homepage config, creating the
 * default row on first access.
 * PATCH /api/admin/homepage-settings — update featuredSource/featuredLayout.
 * Gated on `content:manage`.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const settings = await db.homepageSettings.upsert({
			where: { id: SETTINGS_ID },
			update: {},
			create: { id: SETTINGS_ID },
		});

		return NextResponse.json({ settings });
	} catch (error) {
		console.error('Error fetching homepage settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { featuredSource, featuredLayout } = body;

		if (featuredSource !== undefined && !Object.values(FeaturedSource).includes(featuredSource)) {
			return NextResponse.json({ error: 'Invalid featuredSource' }, { status: 400 });
		}
		if (featuredLayout !== undefined && !Object.values(FeaturedLayout).includes(featuredLayout)) {
			return NextResponse.json({ error: 'Invalid featuredLayout' }, { status: 400 });
		}

		const settings = await db.homepageSettings.upsert({
			where: { id: SETTINGS_ID },
			update: {
				...(featuredSource !== undefined ? { featuredSource } : {}),
				...(featuredLayout !== undefined ? { featuredLayout } : {}),
			},
			create: {
				id: SETTINGS_ID,
				...(featuredSource !== undefined ? { featuredSource } : {}),
				...(featuredLayout !== undefined ? { featuredLayout } : {}),
			},
		});

		return NextResponse.json({ settings });
	} catch (error) {
		console.error('Error updating homepage settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
