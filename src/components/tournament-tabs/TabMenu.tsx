'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Overview from './Overview';
import Participants from './Participants';
import Matches from './Matches';
import Bracket from './Bracket';
import PlayerStats from './PlayerStats';
import type { Champion, TournamentDetail } from './types';

const TABS = [
	{ value: 'overview', label: 'Overview' },
	{ value: 'participants', label: 'Participants' },
	{ value: 'matches', label: 'Matches' },
	{ value: 'bracket', label: 'Bracket' },
	{ value: 'stats', label: 'Player stats' },
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
			<div className='border-b border-border'>
				{/* Scrolls sideways on narrow screens; rings are inset so overflow never clips them. */}
				<TabsList aria-label='Tournament sections' className='flex h-auto w-full snap-x snap-mandatory justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className='relative shrink-0 snap-start rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-none'
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
