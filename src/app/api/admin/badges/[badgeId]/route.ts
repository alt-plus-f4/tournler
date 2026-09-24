import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { BADGE_ICON_KEYS, isBadgeImageUrl } from '@/lib/badge-icons';
import { deleteBlobsQuietly } from '@/lib/blob';

const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

async function authorize() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
	}
	return { session };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ badgeId: string }> }) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { badgeId } = await params;
		const id = Number.parseInt(badgeId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid badge ID' }, { status: 400 });

		const body = await request.json();
		const { name, description, icon, color, isOverlay, imageUrl } = body;

		if (icon !== undefined && !BADGE_ICON_KEYS.includes(icon)) {
			return NextResponse.json({ error: 'Invalid icon' }, { status: 400 });
		}
		if (color !== undefined && !HEX_COLOR.test(color)) {
			return NextResponse.json({ error: 'Color must be a hex value like #facc15' }, { status: 400 });
		}

		if (imageUrl !== undefined && imageUrl !== null && !isBadgeImageUrl(imageUrl)) {
			return NextResponse.json({ error: 'Image must be uploaded through the badge image uploader' }, { status: 400 });
		}

		const previous = imageUrl !== undefined ? await db.badge.findUnique({ where: { id }, select: { imageUrl: true } }) : null;

		const badge = await db.badge.update({
			where: { id },
			data: {
				...(name !== undefined ? { name } : {}),
				...(description !== undefined ? { description: description || null } : {}),
				...(icon !== undefined ? { icon } : {}),
				...(color !== undefined ? { color } : {}),
				...(isOverlay !== undefined ? { isOverlay: Boolean(isOverlay) } : {}),
				...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
			},
		});

		// Replaced or removed artwork: drop the old file from Blob (best effort, never fails the save).
		if (previous?.imageUrl && previous.imageUrl !== badge.imageUrl) await deleteBlobsQuietly([previous.imageUrl]);

		return NextResponse.json({ badge });
	} catch (error) {
		if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
			return NextResponse.json({ error: 'A badge with that name already exists' }, { status: 409 });
		}
		console.error('Error updating badge:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ badgeId: string }> }) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { badgeId } = await params;
		const id = Number.parseInt(badgeId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid badge ID' }, { status: 400 });

		const deleted = await db.badge.delete({ where: { id }, select: { imageUrl: true } });
		await deleteBlobsQuietly([deleted.imageUrl]);
		return NextResponse.json({ message: 'Badge deleted' });
	} catch (error) {
		console.error('Error deleting badge:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
