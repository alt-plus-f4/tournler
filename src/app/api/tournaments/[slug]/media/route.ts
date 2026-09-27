import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadImage(file: Blob, path: string): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const blob = await put(path, arrayBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
	return blob.url;
}

/**
 * Uploads a new banner and/or logo for an existing tournament (the create form's own upload
 * happens inline in POST /api/tournaments; this is its counterpart for editing afterward). Same
 * organizer-or-tournaments:manage rule as PATCH /api/tournaments/[slug].
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		const numericId = parseInt(slug, 10);
		if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });

		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const tournament = await db.cs2Tournament.findUnique({ where: { id: numericId }, select: { organizerId: true } });
		if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

		const canManage = tournament.organizerId === session.user.id || (await userHasPermission(session.user.id, 'tournaments:manage'));
		if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

		const formData = await request.formData();
		const bannerFile = formData.get('bannerFile');
		const logoFile = formData.get('logoFile');
		if (!(bannerFile instanceof Blob) && !(logoFile instanceof Blob)) {
			return NextResponse.json({ error: 'No image provided' }, { status: 400 });
		}

		for (const file of [bannerFile, logoFile]) {
			if (!(file instanceof Blob)) continue;
			if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Files must be images' }, { status: 400 });
			if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Images must be smaller than 5MB' }, { status: 400 });
		}

		const now = Date.now();
		const data: { bannerUrl?: string; logoUrl?: string } = {};
		if (bannerFile instanceof Blob) data.bannerUrl = await uploadImage(bannerFile, `banners/tournament-${numericId}-${now}.png`);
		if (logoFile instanceof Blob) data.logoUrl = await uploadImage(logoFile, `logos/tournament-${numericId}-${now}.png`);

		const updated = await db.cs2Tournament.update({ where: { id: numericId }, data });

		return NextResponse.json({ tournament: updated }, { status: 200 });
	} catch (error) {
		console.error('Error uploading tournament media:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
