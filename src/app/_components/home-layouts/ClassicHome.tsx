import { Suspense } from 'react';
import Link from 'next/link';
import { FeaturedTournamentCard } from '@/components/FeaturedTournamentCard';
import { FeaturedNewsPostCard } from '@/components/FeaturedNewsPostCard';
import { RewatchPlayer } from '@/components/home/RewatchPlayer';
import { UpNext, getUpNext } from '@/components/home/UpNext';
import { resolveRewatch } from '@/components/home/rewatch-config';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { ForumHomeBlock } from '@/components/forum/ForumHomeBlock';
import { FeaturedSkeleton, ForumBlockSkeleton, UpcomingSkeleton, UpNextSkeleton } from '../home-skeletons';
import {
	UPCOMING_COUNT,
	getCuratedFeaturedTournaments,
	getFallbackFeaturedTournaments,
	getFeaturedNews,
	getHomepageSettings,
	getRecentForumThreads,
	getUpcomingTournaments,
} from '@/lib/home/data';
import { Hero, getLive } from './blocks';

const FALLBACK_BANNER = '/info-image.png';

// The original homepage, unchanged. Each section is its own Suspense boundary; the shared loaders
// (settings, live matches) are memoized per request so sections needing the same row share one query.

/** Up next, then (only while something is live) the VOD drops below it. */
async function UpNextBlock() {
	const [rows, allLive, settings] = await Promise.all([getUpNext(), getLive(), getHomepageSettings()]);
	const liveMatches = settings?.showLiveMatches === false ? [] : allLive;
	return (
		<>
			<UpNext rows={rows} />
			{liveMatches.length > 0 && <RewatchPlayer rewatch={resolveRewatch(settings)} priority={false} />}
		</>
	);
}

async function FeaturedSections() {
	const settings = await getHomepageSettings();
	const featuredSource = settings?.featuredSource ?? 'TOURNAMENTS';
	const featuredLayout = settings?.featuredLayout ?? 'GRID';
	const layoutClass = featuredLayout === 'CAROUSEL' ? 'flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';
	const itemClass = featuredLayout === 'CAROUSEL' ? 'min-w-[280px] max-w-[320px] snap-start shrink-0' : '';

	const [curatedFeatured, featuredNews] = await Promise.all([
		featuredSource !== 'NEWS' ? getCuratedFeaturedTournaments() : Promise.resolve([]),
		featuredSource !== 'TOURNAMENTS' ? getFeaturedNews() : Promise.resolve([]),
	]);

	// Nothing curated yet — fall back to the original prize-pool heuristic so the
	// section isn't empty the moment this feature ships with no admin curation done.
	const featuredTournaments = curatedFeatured.length > 0 ? curatedFeatured : featuredSource !== 'NEWS' ? await getFallbackFeaturedTournaments() : [];

	return (
		<>
			{featuredSource !== 'NEWS' && (
				<section>
					<div className='flex items-center justify-between mb-8'>
						<h2 className='text-2xl font-bold tracking-tight'>Featured Tournaments</h2>
						<Link href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
							All
						</Link>
					</div>
					{featuredTournaments.length > 0 ? (
						<div className={layoutClass}>
							{featuredTournaments.map((tournament) => (
								<div key={tournament.id} className={itemClass}>
									<FeaturedTournamentCard
										id={tournament.id}
										name={tournament.name}
										status={tournament.status}
										startDate={tournament.startDate.toISOString()}
										bannerUrl={tournament.bannerUrl || FALLBACK_BANNER}
										prizePool={tournament.prizePool}
										location={tournament.location}
										game={tournament.game}
									/>
								</div>
							))}
						</div>
					) : (
						<p className='text-muted-foreground'>No tournaments yet — check back soon.</p>
					)}
				</section>
			)}

			{featuredSource !== 'TOURNAMENTS' && (
				<section>
					<div className='flex items-center justify-between mb-8'>
						<h2 className='text-2xl font-bold tracking-tight'>Featured News</h2>
					</div>
					{featuredNews.length > 0 ? (
						<div className={layoutClass}>
							{featuredNews.map((post) => (
								<div key={post.id} className={itemClass}>
									<FeaturedNewsPostCard
										id={post.id}
										hasContent={post.content != null}
										title={post.title}
										blurb={post.blurb}
										imageUrl={post.imageUrl}
										link={post.link}
										publishedAt={post.publishedAt.toISOString()}
									/>
								</div>
							))}
						</div>
					) : (
						<p className='text-muted-foreground'>No news yet — check back soon.</p>
					)}
				</section>
			)}
		</>
	);
}

async function UpcomingList() {
	const upcoming = await getUpcomingTournaments();

	return upcoming.length > 0 ? (
		<>
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
		</>
	) : (
		<p className='text-sm text-muted-foreground'>Nothing scheduled yet.</p>
	);
}

/** Hidden entirely (null) when an admin turns off "Show recent forum posts" in /admin/featured. */
async function ForumBlock() {
	const settings = await getHomepageSettings();
	if (!(settings?.showForumPosts ?? true)) return null;
	const threads = await getRecentForumThreads(8);
	return <ForumHomeBlock threads={threads} />;
}

export async function ClassicHome() {
	// The hero is awaited up front (not streamed): it holds the LCP image, and its queries are cached.
	const hero = await Hero();

	return (
		<div className='container mx-auto max-w-[1400px] px-4 lg:px-8'>
			<h1 className='sr-only'>Tournler: hosted CS2 tournaments</h1>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 py-8'>
				<div className='space-y-8'>
					{hero}
					<Suspense fallback={<FeaturedSkeleton />}>
						<FeaturedSections />
					</Suspense>
					<Suspense fallback={<UpNextSkeleton />}>
						<UpNextBlock />
					</Suspense>
				</div>

				<div className='lg:sticky lg:top-16 space-y-4 h-fit'>
					<div className='flex items-center justify-between mb-6'>
						<h2 className='text-2xl font-bold tracking-tight'>Upcoming</h2>
						<Link href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
							All
						</Link>
					</div>
					<div className='space-y-4'>
						<Suspense fallback={<UpcomingSkeleton count={UPCOMING_COUNT} />}>
							<UpcomingList />
						</Suspense>
					</div>
					<Suspense fallback={<ForumBlockSkeleton />}>
						<ForumBlock />
					</Suspense>
				</div>
			</div>
		</div>
	);
}
