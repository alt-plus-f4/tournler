import sharp from 'sharp';
import { put } from '@vercel/blob';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface ProcessImageOptions {
	/** Never upscaled — only ever shrinks a larger original down to fit. */
	maxWidth: number;
	maxHeight: number;
	quality?: number;
}

/**
 * Validates an uploaded image (any `image/*` MIME, <=5MB) and stores it in Vercel Blob at
 * `${basePath}.<ext>`. SVGs are stored as-is — already vector/tiny, and re-rasterizing one would
 * only make it bigger — everything else is resized to fit within maxWidth x maxHeight and
 * re-encoded as WebP, so a raw phone-camera upload doesn't sit in Blob (and get fetched fresh by
 * the image optimizer on every cache miss) as a multi-megabyte PNG.
 */
export async function processAndUploadImage(file: Blob, basePath: string, { maxWidth, maxHeight, quality = 82 }: ProcessImageOptions): Promise<string> {
	if (!file.type.startsWith('image/')) throw new Error('Files must be images');
	if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be smaller than 5MB');

	const buffer = Buffer.from(await file.arrayBuffer());

	if (file.type === 'image/svg+xml') {
		const blob = await put(`${basePath}.svg`, buffer, { access: 'public', contentType: 'image/svg+xml', token: process.env.BLOB_READ_WRITE_TOKEN });
		return blob.url;
	}

	const resized = await sharp(buffer)
		.rotate() // bakes in EXIF orientation before resizing, since the resized output drops the tag
		.resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
		.webp({ quality })
		.toBuffer();

	const blob = await put(`${basePath}.webp`, resized, { access: 'public', contentType: 'image/webp', token: process.env.BLOB_READ_WRITE_TOKEN });
	return blob.url;
}
