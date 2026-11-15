import { getNavData } from '@/lib/hub/data';
import { SiteHeader, type HeaderData } from './shell/SiteHeader';

/**
 * The site header (Nav F). Reads no request data: the per-game status line comes from one
 * tagged data-cache entry (getNavData), so pages stay prerenderable.
 * Account-specific controls hydrate client-side in <NavAccount />.
 */
export default async function Navbar() {
	let data: HeaderData = null;
	try {
		data = await getNavData();
	} catch (error) {
		// The header must never take a page down; it just renders without the status line.
		console.error('Navbar data failed to load:', error);
	}
	return <SiteHeader data={data} />;
}
