import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: [
				'/admin',
				'/api',
				// Thin/no-content or behind-auth pages: nothing here is worth a crawl budget.
				'/sign-in',
				'/sign-up',
				'/news/new',
				'/forum/new',
			],
		},
		sitemap: `${siteUrl()}/sitemap.xml`,
	};
}
