/**
 * Remote hosts next/image may optimize. Keep in sync with `images.remotePatterns` in
 * next.config.mjs (that file is plain ESM and can't import this TS module).
 * - Vercel Blob: every upload (avatars, team logos/banners, tournament art, news covers, trophies).
 * - cdn.discordapp.com: Discord OAuth profile pictures stored as User.image.
 *
 * i.ytimg.com (the homepage rewatch poster, RewatchPlayer.tsx) is deliberately excluded: it's
 * already a small pre-compressed JPEG, so re-optimizing it buys nothing, and it's also the page's
 * LCP image — routing it through our own fetch-then-resize proxy instead of letting the browser
 * hit YouTube's own CDN directly measured as most of that page's LCP time (Lighthouse: ~2.5s of a
 * ~5.2s LCP). RewatchPlayer renders it `unoptimized` for exactly this reason.
 */
export const OPTIMIZED_IMAGE_HOSTS: readonly string[] = ['6q0iedxcfemxlbr8.public.blob.vercel-storage.com', 'cdn.discordapp.com'];

/**
 * true when `src` can go through the next/image optimizer: an https URL on an allowlisted host, or a
 * site-relative path. SVG never qualifies (the optimizer refuses it without dangerouslyAllowSVG, and
 * it's already resolution-independent), nor do blob:/data: URLs (local previews).
 */
export function isOptimizable(src: string) {
	try {
		const url = new URL(src);
		if (url.pathname.toLowerCase().endsWith('.svg')) return false;
		return url.protocol === 'https:' && OPTIMIZED_IMAGE_HOSTS.includes(url.hostname);
	} catch {
		return src.startsWith('/') && !src.startsWith('//') && !src.toLowerCase().endsWith('.svg');
	}
}
