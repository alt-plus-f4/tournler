import 'server-only';

/**
 * The app's own canonical origin, no trailing slash — for absolute URLs in places Next won't
 * resolve relative ones itself (robots.ts's `sitemap` field, every `url` in sitemap.ts).
 * `NEXTAUTH_URL` is already this app's canonical URL everywhere else (see auth.ts, CLAUDE.md);
 * `VERCEL_URL` covers preview deployments that don't set it, and localhost is the dev fallback.
 */
export function siteUrl(): string {
	const raw = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) || 'http://localhost:3000';
	return raw.replace(/\/+$/, '');
}
