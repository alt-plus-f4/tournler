import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { sanitizeRichText } from '@/lib/helpers/sanitize-html';
import { put } from '@vercel/blob';

const MAX_NEWS_IMAGE_BYTES = 5 * 1024 * 1024;

async function authorize() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
	}
	return { session };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ newsId: string }> }) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { newsId } = await params;
		const id = Number.parseInt(newsId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

		const formData = await request.formData();
		const title = formData.get('title')?.toString();
		const blurb = formData.get('blurb')?.toString();
		const link = formData.get('link')?.toString();
		const isFeatured = formData.get('isFeatured')?.toString();
		const featuredOrder = formData.get('featuredOrder')?.toString();
		const clearImage = formData.get('clearImage')?.toString() === 'true';

		let imageUrl: string | null | undefined;
		const imageFile = formData.get('imageFile');
		if (imageFile instanceof Blob && imageFile.size > 0) {
			if (!imageFile.type.startsWith('image/')) {
				return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
			}
			if (imageFile.size > MAX_NEWS_IMAGE_BYTES) {
				return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
			}
			const arrayBuffer = await imageFile.arrayBuffer();
			const blob = await put(`news/post-${id}-${Date.now()}.png`, arrayBuffer, {
				access: 'public',
				token: process.env.BLOB_READ_WRITE_TOKEN,
			});
			imageUrl = blob.url;
		} else if (clearImage) {
			imageUrl = null;
		}

		const post = await db.newsPost.update({
			where: { id },
			data: {
				...(title !== undefined ? { title } : {}),
				...(blurb !== undefined ? { blurb: sanitizeRichText(blurb) } : {}),
				...(imageUrl !== undefined ? { imageUrl } : {}),
				...(link !== undefined ? { link: link || null } : {}),
				...(isFeatured !== undefined ? { isFeatured: isFeatured === 'true' } : {}),
				...(featuredOrder !== undefined ? { featuredOrder: featuredOrder === '' ? null : Number(featuredOrder) } : {}),
			},
		});

		return NextResponse.json({ post });
	} catch (error) {
		console.error('Error updating news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ newsId: string }> }) {
	const auth = await authorize();
	if (auth.error) return auth.error;

	try {
		const { newsId } = await params;
		const id = Number.parseInt(newsId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

		await db.newsPost.delete({ where: { id } });
		return NextResponse.json({ message: 'News post deleted' });
	} catch (error) {
		console.error('Error deleting news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
