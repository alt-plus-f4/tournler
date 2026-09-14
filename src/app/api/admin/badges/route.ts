import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { BADGE_ICON_KEYS } from '@/lib/badge-icons';

const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

/**
 * GET /api/admin/badges — list every badge definition with how many players hold it.
 * POST /api/admin/badges — create a new badge definition.
 * Gated on `content:manage` — badge definitions are recognition/content, not account management.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const badges = await db.badge.findMany({
			orderBy: { createdAt: 'desc' },
			include: { _count: { select: { awards: true } } },
		});

		return NextResponse.json({ badges });
	} catch (error) {
		console.error('Error fetching badges:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { name, description, icon, color, isOverlay } = body;

		if (!name || typeof name !== 'string') {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}
		if (!icon || !BADGE_ICON_KEYS.includes(icon)) {
			return NextResponse.json({ error: 'Invalid icon' }, { status: 400 });
		}
		if (color !== undefined && !HEX_COLOR.test(color)) {
			return NextResponse.json({ error: 'Color must be a hex value like #facc15' }, { status: 400 });
		}

		const badge = await db.badge.create({
			data: {
				name,
				description: description || null,
				icon,
				color: color || undefined,
				isOverlay: Boolean(isOverlay),
			},
		});

		return NextResponse.json({ badge }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
			return NextResponse.json({ error: 'A badge with that name already exists' }, { status: 409 });
		}
		console.error('Error creating badge:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
