'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Overview from './Overview';
import Participants from './Participants';
import Prizes from './Prizes';

// The data-driven tabs (each fetches its own data with SWR) are split out and only loaded when their
// tab is opened; Radix doesn't mount inactive tab panels, so the default Overview tab never pulls them in.
const tabLoading = () => <Skeleton className='mx-4 mt-6 h-64 rounded-md md:mx-8' />;
const Matches = dynamic(() => import('./Matches'), { loading: tabLoading });
const Bracket = dynamic(() => import('./Bracket'), { loading: tabLoading });
const PlayerStats = dynamic(() => import('./PlayerStats'), { loading: tabLoading });
import type { Champion, TournamentDetail } from './types';

const TABS = [
	{ value: 'overview', label: 'Overview' },
	{ value: 'participants', label: 'Participants' },
	{ value: 'prizes', label: 'Prizes' },
	{ value: 'matches', label: 'Matches' },
	{ value: 'bracket', label: 'Bracket' },
	{ value: 'stats', label: 'Stats' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function isTab(value: string | null): value is TabValue {
	return TABS.some((t) => t.value === value);
}

interface TabMenuProps {
	tournament: TournamentDetail;
	champion: Champion | null;
}

/**
 * Radix tabs (roving focus + arrow keys + tab/tabpanel wiring) with the active tab kept in
 * `?tab=`, so deep links and coming back from a match page land on the same tab. Uses the native
 * History API, which Next syncs into useSearchParams without a server round trip.
 */
export default function TabMenu({ tournament, champion }: TabMenuProps) {
	const searchParams = useSearchParams();
	const param = searchParams.get('tab');
	const activeTab: TabValue = isTab(param) ? param : 'overview';

	const setActiveTab = (value: string) => {
		if (!isTab(value)) return;
		const params = new URLSearchParams(searchParams.toString());
		if (value === 'overview') params.delete('tab');
		else params.set('tab', value);
		const query = params.toString();
		window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
	};

	return (
		<Tabs value={activeTab} onValueChange={setActiveTab}>
			<div className='border-b border-border md:mx-4'>
				{/* The original spread-out tab bar: evenly spaced on phones, wide gaps from md. Scrolls sideways
				    if it has to; focus rings are inset so the overflow never clips them. */}
				<TabsList aria-label='Tournament sections' className='flex h-auto w-full justify-between gap-2 overflow-x-auto rounded-none bg-transparent px-0 py-2 [scrollbar-width:none] md:justify-start md:gap-16 lg:gap-24 [&::-webkit-scrollbar]:hidden'>
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className='shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent p-2 text-sm font-medium text-muted-foreground transition-colors hover:text-white focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-none sm:text-base'
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			<TabsContent value='overview' className='mt-0'>
				<Overview tournament={tournament} champion={champion} setActiveTab={setActiveTab} />
			</TabsContent>
			<TabsContent value='participants' className='mt-0'>
				<Participants tournament={tournament} />
			</TabsContent>
			<TabsContent value='prizes' className='mt-0'>
				<Prizes prizePool={tournament.prizePool} />
			</TabsContent>
			<TabsContent value='matches' className='mt-0'>
				<Matches tournament={tournament} />
			</TabsContent>
			<TabsContent value='bracket' className='mt-0'>
				<Bracket tournament={tournament} />
			</TabsContent>
			<TabsContent value='stats' className='mt-0'>
				<PlayerStats tournament={tournament} />
			</TabsContent>
		</Tabs>
	);
}
