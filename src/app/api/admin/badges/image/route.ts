import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { BADGE_IMAGE_MAX_BYTES, BADGE_IMAGE_TYPES } from '@/lib/badge-icons';

type BadgeImageType = (typeof BADGE_IMAGE_TYPES)[number];

const EXTENSION: Record<BadgeImageType, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
};

/** Anything in an SVG that could run code or pull in outside content. SVGs are only ever drawn via <img>, but we still refuse these. */
const UNSAFE_SVG = /<script|<foreignObject|<iframe|<embed|<object|<!ENTITY|<!DOCTYPE|\bon[a-z]+\s*=|javascript:|data:text\/html|href\s*=\s*["']?\s*(?:https?:|\/\/)/i;

/** Check the bytes, not just the browser-supplied MIME type. */
function sniff(bytes: Uint8Array, declared: BadgeImageType): boolean {
	const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b);
	switch (declared) {
		case 'image/png':
			return at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
		case 'image/jpeg':
			return at(0, 0xff, 0xd8, 0xff);
		case 'image/webp':
			return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
		case 'image/svg+xml': {
			const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
			return /<svg[\s>]/i.test(text) && !UNSAFE_SVG.test(text);
		}
	}
}

/**
 * POST /api/admin/badges/image — upload trophy artwork to Vercel Blob and return its URL.
 * The badge itself is only changed when the admin saves the dialog (imageUrl goes through the badge
 * create/update routes). Same `content:manage` gate as the other badge admin routes.
 */
export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const formData = await request.formData().catch(() => null);
		const file = formData?.get('file');
		if (!(file instanceof Blob)) return NextResponse.json({ error: 'Attach an image file' }, { status: 400 });

		const type = file.type as BadgeImageType;
		if (!BADGE_IMAGE_TYPES.includes(type)) {
			return NextResponse.json({ error: 'Use a PNG, JPEG, WebP or SVG image' }, { status: 400 });
		}
		if (file.size === 0 || file.size > BADGE_IMAGE_MAX_BYTES) {
			return NextResponse.json({ error: 'Image must be smaller than 2 MB' }, { status: 400 });
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		if (!sniff(bytes, type)) {
			return NextResponse.json(
				{ error: type === 'image/svg+xml' ? 'This SVG contains scripts, event handlers or external references. Export a plain SVG and try again.' : 'That file isn’t a valid image of its type' },
				{ status: 400 }
			);
		}

		// Path carries no user data (never emails): a fixed prefix plus a random suffix for a fresh, cache-safe URL.
		const blob = await put(`badges/trophy.${EXTENSION[type]}`, Buffer.from(bytes), {
			access: 'public',
			addRandomSuffix: true,
			contentType: type,
			token: process.env.BLOB_READ_WRITE_TOKEN,
		});

		return NextResponse.json({ url: blob.url }, { status: 201 });
	} catch (error) {
		console.error('Error uploading badge image:', error);
		return NextResponse.json({ error: 'Upload failed. Try again in a moment.' }, { status: 500 });
	}
}
