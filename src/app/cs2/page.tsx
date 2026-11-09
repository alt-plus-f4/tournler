import type { Metadata } from 'next';
import { HubOverview } from '@/app/_components/hub-overview/HubOverview';

export const metadata: Metadata = {
	title: 'Counter-Strike 2 hub',
	description: 'Live CS2 matches, open tournaments, team ranking and teams looking for players on Tournler.',
};

export default function Cs2HubPage() {
	return <HubOverview game='CS2' />;
}
