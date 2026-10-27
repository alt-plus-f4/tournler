import type { HomepageLayoutValue } from '@/lib/home/layouts';
import { CampusHome } from './CampusHome';
import { ClassicHome } from './ClassicHome';
import { DoorsHome } from './DoorsHome';
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
		default:
			return <ClassicHome />;
	}
}
