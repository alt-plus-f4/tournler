import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { sanitizeRichText } from '@/lib/helpers/sanitize-html';
import { put } from '@vercel/blob';

const MAX_NEWS_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * GET /api/admin/news — list every news post.
 * POST /api/admin/news — create a new news post, authored by the current admin.
 * Gated on `content:manage`.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const posts = await db.newsPost.findMany({ orderBy: { createdAt: 'desc' } });

		return NextResponse.json({ posts });
	} catch (error) {
		console.error('Error fetching news posts:', error);
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

		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';
		const blurb = formData.get('blurb')?.toString() ?? '';
		const link = formData.get('link')?.toString() ?? '';
		const isFeatured = formData.get('isFeatured')?.toString() ?? '';
		const featuredOrder = formData.get('featuredOrder')?.toString() ?? '';

		if (!title) {
			return NextResponse.json({ error: 'Title is required' }, { status: 400 });
		}
		if (!blurb) {
			return NextResponse.json({ error: 'Blurb is required' }, { status: 400 });
		}

		let imageUrl: string | null = null;
		const imageFile = formData.get('imageFile');
		if (imageFile instanceof Blob && imageFile.size > 0) {
			if (!imageFile.type.startsWith('image/')) {
				return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
			}
			if (imageFile.size > MAX_NEWS_IMAGE_BYTES) {
				return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
			}
			const arrayBuffer = await imageFile.arrayBuffer();
			const blob = await put(`news/post-${Date.now()}.png`, arrayBuffer, {
				access: 'public',
				token: process.env.BLOB_READ_WRITE_TOKEN,
			});
			imageUrl = blob.url;
		}

		const post = await db.newsPost.create({
			data: {
				title,
				blurb: sanitizeRichText(blurb),
				imageUrl,
				link: link || null,
				isFeatured: isFeatured === 'true',
				featuredOrder: featuredOrder !== '' ? Number(featuredOrder) : null,
				authorId: session.user.id,
			},
		});

		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		console.error('Error creating news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
