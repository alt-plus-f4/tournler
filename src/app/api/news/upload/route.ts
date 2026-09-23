import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
import { requireContentManager } from '../_lib/auth';

const MAX_NEWS_IMAGE_BYTES = 5 * 1024 * 1024;

// Raster formats only: SVG can carry script, so it's never accepted.
const EXTENSIONS: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif',
};

/**
 * POST /api/news/upload — upload an image for a news post (cover or inline EditorJS image).
 * Multipart field `image` (EditorJS ImageTool's default) or `file`. Requires `content:manage`.
 * Responds in ImageTool's shape: `{ success: 1, file: { url } }`.
 */
export async function POST(request: Request) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;

	try {
		const formData = await request.formData();
		const file = formData.get('image') ?? formData.get('file');

		if (!(file instanceof Blob) || file.size === 0) {
			return NextResponse.json({ success: 0, error: 'Missing image' }, { status: 400 });
		}
		const ext = EXTENSIONS[file.type];
		if (!ext) {
			return NextResponse.json({ success: 0, error: 'Image must be PNG, JPEG, WebP, GIF or AVIF' }, { status: 400 });
		}
		if (file.size > MAX_NEWS_IMAGE_BYTES) {
			return NextResponse.json({ success: 0, error: 'Image must be smaller than 5MB' }, { status: 400 });
		}

		const blob = await put(`news/post-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`, await file.arrayBuffer(), {
			access: 'public',
			contentType: file.type,
			token: process.env.BLOB_READ_WRITE_TOKEN,
		});

		return NextResponse.json({ success: 1, file: { url: blob.url } });
	} catch (error) {
		console.error('Error uploading news image:', error);
		return NextResponse.json({ success: 0, error: 'Upload failed' }, { status: 500 });
	}
}
