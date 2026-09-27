import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { GAME_FILTER_COOKIE, GAME_META, parseGameParam } from '@/lib/games';
import { HubSubnav } from '@/components/shell/HubSubnav';
import { HubPageGlow } from '@/components/shell/HubPageGlow';
import { TeamsBanner, TeamsBannerSkeleton } from './_components/TeamsBanner';
import { TeamsCreateSlot } from './_components/TeamsCreateSlot';
import { TeamsCards, TeamsCardsSkeleton } from './_components/TeamsCards';

export const metadata: Metadata = {
	title: 'Teams',
};

// Team list and the viewer's own team change constantly; never serve a build-time snapshot.
export const dynamic = 'force-dynamic';

interface TeamsPageProps {
	searchParams?: Promise<{ game?: string | string[] }>;
}

export default async function Page({ searchParams }: TeamsPageProps = {}) {
	const [params, cookieStore] = await Promise.all([searchParams ?? Promise.resolve({} as { game?: string | string[] }), cookies()]);
	// ?game= wins (links, shares); without it, the channel the viewer last picked (cookie, set by the
	// navbar switch) — same rule as /matches and /tournaments. The page only ever shows one channel.
	const rawGame = typeof params.game === 'string' ? params.game : cookieStore.get(GAME_FILTER_COOKIE)?.value;
	const game = parseGameParam(rawGame) ?? 'CS2';

	return (
		<>
			<HubPageGlow game={game} />
			<HubSubnav game={game} active='teams' />
			<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Teams</h1>
				<p className='mt-2 text-sm text-muted-foreground'>{GAME_META[game].label} rosters on Tournler: five players, one of them captain. Switch hubs in the nav for the other game.</p>

				{/* No session read at page level: it only affects this banner and the create button
				    below, each in its own Suspense boundary so neither blocks the page shell. */}
				<Suspense key={game} fallback={<TeamsBannerSkeleton />}>
					<TeamsBanner game={game} />
				</Suspense>

				<h2 className='mt-10 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>{GAME_META[game].label} teams</h2>

				{/* Every tile here streams independently, so nothing blocks on the viewer's own session. */}
				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					<Suspense key={`create-${game}`} fallback={null}>
						<TeamsCreateSlot game={game} />
					</Suspense>
					<Suspense key={`cards-${game}`} fallback={<TeamsCardsSkeleton />}>
						<TeamsCards game={game} />
					</Suspense>
				</div>
			</div>
		</>
	);
}
