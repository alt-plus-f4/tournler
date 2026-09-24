/** @type {import('next').NextConfig} */
const nextConfig = {
	// ~20KB of atomic Tailwind CSS: inlining it removes the render-blocking stylesheet request on first
	// load (Lighthouse: ~340ms). Production builds only.
	experimental: { inlineCss: true },
	images: {
		// Keep in sync with OPTIMIZED_IMAGE_HOSTS in src/lib/image-hosts.ts. Anything else (SVG,
		// third-party link previews, local blob: previews) is rendered with `unoptimized`.
		remotePatterns: [
			// Vercel Blob: every upload (avatars, team logos/banners, tournament art, news covers, trophies).
			{ protocol: 'https', hostname: '6q0iedxcfemxlbr8.public.blob.vercel-storage.com', pathname: '/**' },
			// Discord OAuth profile pictures (User.image for Discord sign-ins).
			{ protocol: 'https', hostname: 'cdn.discordapp.com', pathname: '/**' },
			// YouTube thumbnails for the homepage rewatch poster.
			{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
		],
	},
};

export default nextConfig;
