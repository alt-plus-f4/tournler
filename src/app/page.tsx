import { HomeLayoutView } from './_components/home-layouts';
import { getHomepageSettings } from '@/lib/home/data';
import { parseHomepageLayout } from '@/lib/home/layouts';

// Live scores, lobbies, curation and forum activity all change by the minute. The root layout no
// longer reads the session, so without this the homepage would be prerendered once at build.
// No per-viewer data here, so the page is regenerated at most every 15s and otherwise served from
// the cache. Any write to matches/tournaments/news/forum/homepage settings invalidates it at once
// via the cache tags used by the queries in src/lib/home/data.ts (and src/lib/cache).
export const revalidate = 15;

/** Which layout to show is a staff setting (/admin/featured); each layout lives in _components/home-layouts. */
export default async function Page() {
	const settings = await getHomepageSettings();
	return <HomeLayoutView layout={parseHomepageLayout(settings?.pageLayout)} />;
}
