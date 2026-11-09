import type { HomepageLayoutValue } from '@/lib/home/layouts';
import { CampusHome } from './CampusHome';
import { ClassicHome } from './ClassicHome';
import { DoorsHome } from './DoorsHome';
import { ModernHome } from './ModernHome';
import { SeasonHome } from './SeasonHome';
import { WeekHome } from './WeekHome';

/** Renders exactly one homepage layout, so the others never run their queries. */
export function HomeLayoutView({ layout }: { layout: HomepageLayoutValue }) {
	switch (layout) {
		case 'SEASON':
			return <SeasonHome />;
		case 'DOORS':
			return <DoorsHome />;
		case 'CAMPUS':
			return <CampusHome />;
		case 'WEEK':
			return <WeekHome />;
		case 'MODERN':
			return <ModernHome />;
		default:
			return <ClassicHome />;
	}
}
