import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { siteUrl } from '@/lib/site-url';

// Google's own cap is 50,000 URLs/sitemap; this app is nowhere near that, but a hard limit per
// section keeps a runaway table (or a future traffic spike) from ever generating an unbounded one.
const SECTION_LIMIT = 2000;

/** Every dynamic detail page's id + updatedAt, all in one cached round trip per section. */
const listSitemapEntries = cachedQuery(
	async () => {
		const [tournaments, teams, news, forum] = await Promise.all([
			db.cs2Tournament.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'desc' }, take: SECTION_LIMIT }),
			db.cs2Team.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'desc' }, take: SECTION_LIMIT }),
			db.newsPost.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'desc' }, take: SECTION_LIMIT }),
			db.forumThread.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'desc' }, take: SECTION_LIMIT }),
		]);
		return { tournaments, teams, news, forum };
	},
	['sitemap-entries'],
	{ tags: ['tournaments', 'teams', 'news', 'forum'], revalidate: REVALIDATE.slow },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = siteUrl();
	const { tournaments, teams, news, forum } = await listSitemapEntries();

	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: base, changeFrequency: 'daily', priority: 1 },
		{ url: `${base}/tournaments`, changeFrequency: 'hourly', priority: 0.9 },
		{ url: `${base}/matches`, changeFrequency: 'hourly', priority: 0.8 },
		{ url: `${base}/teams`, changeFrequency: 'daily', priority: 0.7 },
		{ url: `${base}/news`, changeFrequency: 'daily', priority: 0.7 },
		{ url: `${base}/forum`, changeFrequency: 'hourly', priority: 0.6 },
		{ url: `${base}/information`, changeFrequency: 'monthly', priority: 0.3 },
		{ url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
		{ url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.1 },
	];

	return [
		...staticRoutes,
		...tournaments.map(({ id, updatedAt }) => ({ url: `${base}/tournaments/${id}`, lastModified: updatedAt, changeFrequency: 'hourly' as const, priority: 0.8 })),
		...teams.map(({ id, updatedAt }) => ({ url: `${base}/teams/${id}`, lastModified: updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
		...news.map(({ id, updatedAt }) => ({ url: `${base}/news/${id}`, lastModified: updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 })),
		...forum.map(({ id, updatedAt }) => ({ url: `${base}/forum/${id}`, lastModified: updatedAt, changeFrequency: 'weekly' as const, priority: 0.4 })),
	];
}
