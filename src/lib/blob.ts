import { del } from '@vercel/blob';

/** True for files in this project's Vercel Blob store (not DiceBear data URLs or external images). */
export function isBlobUrl(url: string | null | undefined): url is string {
	if (!url) return false;
	try {
		return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
	} catch {
		return false;
	}
}

/** Deletes Blob files if they're ours; a failure is logged, never thrown — the caller's change already happened. */
export async function deleteBlobsQuietly(urls: Array<string | null | undefined>) {
	const targets = urls.filter(isBlobUrl);
	if (targets.length === 0) return;
	try {
		await del(targets);
	} catch (error) {
		console.error('Failed to delete blob(s)', targets, error);
	}
}
