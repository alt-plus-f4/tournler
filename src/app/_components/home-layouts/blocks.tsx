import { cache } from 'react';
import { OnAirPanel, getLiveMatches } from '@/components/OnAirPanel';
import { RewatchPlayer } from '@/components/home/RewatchPlayer';
import { resolveRewatch } from '@/components/home/rewatch-config';
import { FeaturedTournamentCard } from '@/components/FeaturedTournamentCard';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { bucketWeek } from '@/lib/home/standings';
import {
	getCuratedFeaturedTournaments,
	getCurrentWeekMatches,
	getFallbackFeaturedTournaments,
	getFeaturedNews,
	getHomepageSettings,
	getHomeStats,
	getSeasonTournament,
	getTeamRanking,
	getUpcomingTournaments,
} from '@/lib/home/data';
import { FALLBACK_BANNER, MatchTicker, NewsList, RankingTable, SeasonBanner, StatStrip, ThisWeekList, TournamentSpotlight, WeekGrid } from './parts';

// Async server blocks shared by the layouts. Each layout wraps the ones it uses in its own Suspense
// boundary, so a layout only runs the queries of the blocks it renders.

export const getLive = cache(getLiveMatches);

/** Live scoreboard leads when a server reports a match in progress; otherwise the VOD is the hero. */
export async function Hero() {
	const [allLive, settings] = await Promise.all([getLive(), getHomepageSettings()]);
	const liveMatches = settings?.showLiveMatches === false ? [] : allLive;
	return liveMatches.length > 0 ? <OnAirPanel matches={liveMatches} /> : <RewatchPlayer rewatch={resolveRewatch(settings)} />;
}

export async function SeasonBannerBlock() {
	return <SeasonBanner tournament={await getSeasonTournament()} />;
}

export async function SpotlightBlock() {
	return <TournamentSpotlight tournament={await getSeasonTournament()} />;
}

export async function StatStripBlock() {
	return <StatStrip stats={await getHomeStats()} />;
}

export async function RankingBlock({ limit }: { limit: number }) {
	return <RankingTable rows={await getTeamRanking()} limit={limit} />;
}

export async function WeekGridBlock() {
	const days = bucketWeek(await getCurrentWeekMatches(), new Date());
	return <WeekGrid days={days} />;
}

export async function ThisWeekBlock({ limit = 7 }: { limit?: number }) {
	const days = bucketWeek(await getCurrentWeekMatches(), new Date());
	return <ThisWeekList days={days} limit={limit} />;
}

const STATE_ORDER: Record<string, number> = { LIVE: 0, PAUSED: 0, SCHEDULED: 1, COMPLETED: 2 };

/** Live first, then upcoming (soonest first), then finished ones (latest first), capped for the ticker strip. */
export async function TickerBlock() {
	const matches = await getCurrentWeekMatches();
	const ordered = [...matches].sort((a, b) => {
		const byState = STATE_ORDER[a.status] - STATE_ORDER[b.status];
		if (byState !== 0) return byState;
		return a.status === 'COMPLETED' ? b.matchDate.getTime() - a.matchDate.getTime() : a.matchDate.getTime() - b.matchDate.getTime();
	});
	return <MatchTicker matches={ordered.slice(0, 8)} />;
}

export async function NewsListBlock({ limit = 3 }: { limit?: number }) {
	const posts = await getFeaturedNews();
	return <NewsList posts={posts.slice(0, limit)} />;
}

/** Curated featured tournaments, falling back to the most valuable active ones. */
export async function FeaturedTournamentsBlock({ limit = 3, columns = 'md:grid-cols-2 xl:grid-cols-3' }: { limit?: number; columns?: string }) {
	const curated = await getCuratedFeaturedTournaments();
	const tournaments = (curated.length > 0 ? curated : await getFallbackFeaturedTournaments()).slice(0, limit);
	if (tournaments.length === 0) return <p className='text-muted-foreground'>No tournaments yet. Check back soon.</p>;
	return (
		<div className={`grid grid-cols-1 gap-5 ${columns}`}>
			{tournaments.map((tournament) => (
				<FeaturedTournamentCard
					key={tournament.id}
					id={tournament.id}
					name={tournament.name}
					status={tournament.status}
					startDate={tournament.startDate.toISOString()}
					bannerUrl={tournament.bannerUrl || FALLBACK_BANNER}
					prizePool={tournament.prizePool}
					location={tournament.location}
					game={tournament.game}
				/>
			))}
		</div>
	);
}

/** Tournaments that are open for teams (not yet started), as the sidebar-style cards. */
export async function OpenTournamentsBlock({ limit = 2 }: { limit?: number }) {
	const upcoming = (await getUpcomingTournaments()).slice(0, limit);
	if (upcoming.length === 0) return <p className='text-sm text-muted-foreground'>Nothing scheduled yet.</p>;
	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
			{upcoming.map((tournament) => (
				<UpcomingTournament
					key={tournament.id}
					id={tournament.id}
					name={tournament.name}
					status={tournament.status}
					startDate={tournament.startDate.toISOString()}
					bannerUrl={tournament.bannerUrl || FALLBACK_BANNER}
					prizePool={tournament.prizePool}
					teams={tournament.teams}
					location={tournament.location}
					teamCapacity={tournament.teamCapacity}
					game={tournament.game}
					isHomePage
				/>
			))}
		</div>
	);
}
