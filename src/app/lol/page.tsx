import type { Metadata } from 'next';
import { HubOverview } from '@/app/_components/hub-overview/HubOverview';

export const metadata: Metadata = {
	title: 'League of Legends hub',
	description: 'League of Legends matches, open tournaments, team ranking and teams looking for players on Tournler.',
};

export default function LolHubPage() {
	return <HubOverview game='LOL' />;
}
