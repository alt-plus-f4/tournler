import { cache, Suspense } from 'react';
import { FeaturedTournamentCard } from '@/components/FeaturedTournamentCard';
import { FeaturedNewsPostCard } from '@/components/FeaturedNewsPostCard';
import { OnAirPanel, getLiveMatches } from '@/components/OnAirPanel';
import { RewatchPlayer } from '@/components/home/RewatchPlayer';
import { UpNext, getUpNext } from '@/components/home/UpNext';
import { resolveRewatch } from '@/components/home/rewatch-config';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { ForumHomeBlock } from '@/components/forum/ForumHomeBlock';
import { recentForumThreads } from '@/components/forum/forum-queries';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import Link from 'next/link';
import { TournamentStatus } from '@prisma/client';
import { FeaturedSkeleton, ForumBlockSkeleton, UpcomingSkeleton, UpNextSkeleton } from './_components/home-skeletons';

// Live scores, lobbies, curation and forum activity all change by the minute. The root layout no
// longer reads the session, so without this the homepage would be prerendered once at build.
// No per-viewer data here, so the page is regenerated at most every 15s and otherwise served from
// the cache. Any write to matches/tournaments/news/forum/homepage settings invalidates it at once
// via the cache tags used by these queries (src/lib/cache).
export const revalidate = 15;

const FALLBACK_BANNER = '/info-image.png';
const UPCOMING_COUNT = 3;

// Each homepage section is its own Suspense boundary; these loaders are memoized per request so
// sections that need the same row (settings, live matches) share one query.
// Shared (non-viewer) reads are also served from Next's data cache; the Prisma extension in
// src/lib/db.ts flushes their tags on every write.
const getHomepageSettings = cache(
	cachedQuery(async () => db.homepageSettings.findUnique({ where: { id: 1 } }), ['home-settings'], { tags: ['homepage'], revalidate: REVALIDATE.slow }),
);
const getLive = cache(getLiveMatches);

// UPCOMING tournaments whose start date has passed are still shown (the cards label them
// "Start pending"), since the organizer hasn't started or cancelled them yet.
const activeTournament = { status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } };

const getCuratedFeaturedTournaments = cachedQuery(
	async () =>
		db.cs2Tournament.findMany({
			where: { isSystem: false, isFeatured: true, ...activeTournament },
			orderBy: [{ featuredOrder: 'asc' }, { prizePool: 'desc' }],
			take: 6,
			include: { teams: true },
		}),
	['home-featured-tournaments-curated'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

const getFallbackFeaturedTournaments = cachedQuery(
	async () =>
		db.cs2Tournament.findMany({
			where: { isSystem: false, ...activeTournament },
			orderBy: { prizePool: 'desc' },
			take: 6,
			include: { teams: true },
		}),
	['home-featured-tournaments-fallback'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

const getFeaturedNews = cachedQuery(
	async () =>
		db.newsPost.findMany({
			where: { isFeatured: true },
			orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
			take: 6,
		}),
	['home-featured-news'],
	{ tags: ['news', 'homepage'], revalidate: REVALIDATE.standard },
);

// Compares startDate against the fill time, so it stays on the live window (<=15s drift).
const getUpcomingTournaments = cachedQuery(
	async () => {
		const now = new Date();
		const upcomingFuture = await db.cs2Tournament.findMany({
			where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { gte: now } },
			orderBy: { startDate: 'asc' },
			take: UPCOMING_COUNT,
			include: { teams: true },
		});

		// Genuinely upcoming first (soonest first); top up with overdue ones (most recently due first).
		return upcomingFuture.length >= UPCOMING_COUNT
			? upcomingFuture
			: [
					...upcomingFuture,
					...(await db.cs2Tournament.findMany({
						where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { lt: now } },
						orderBy: { startDate: 'desc' },
						take: UPCOMING_COUNT - upcomingFuture.length,
						include: { teams: true },
					})),
				];
	},
	['home-upcoming-tournaments'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.live },
);

// Only the homepage block's query; forum pages have their own loaders.
const getRecentForumThreads = cachedQuery(async (take: number) => recentForumThreads(take), ['home-recent-forum-threads'], {
	tags: ['forum'],
	revalidate: REVALIDATE.standard,
});

/** Live scoreboard leads when a server reports a match in progress; otherwise the VOD is the hero. */
async function Hero() {
	const [liveMatches, settings] = await Promise.all([getLive(), getHomepageSettings()]);
	return liveMatches.length > 0 ? <OnAirPanel matches={liveMatches} /> : <RewatchPlayer rewatch={resolveRewatch(settings)} />;
}

/** Up next, then (only while something is live) the VOD drops below it. */
async function UpNextBlock() {
	const [rows, liveMatches, settings] = await Promise.all([getUpNext(), getLive(), getHomepageSettings()]);
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
	const featuredTournaments =
		curatedFeatured.length > 0
			? curatedFeatured
			: featuredSource !== 'NEWS'
				? await getFallbackFeaturedTournaments()
				: [];

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
									<FeaturedTournamentCard id={tournament.id} name={tournament.name} status={tournament.status} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool} location={tournament.location} />
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
									<FeaturedNewsPostCard id={post.id} hasContent={post.content != null} title={post.title} blurb={post.blurb} imageUrl={post.imageUrl} link={post.link} publishedAt={post.publishedAt.toISOString()} />
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
				<UpcomingTournament key={tournament.id} id={tournament.id} name={tournament.name} status={tournament.status} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool} teams={tournament.teams} location={tournament.location} teamCapacity={tournament.teamCapacity} isHomePage />
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

export default async function Page() {
	// The hero is awaited up front (not streamed): it holds the LCP image, and its queries are cached.
	const hero = await Hero();

	return (
		<div className='container mx-auto max-w-[1400px] px-4 lg:px-8'>
			<h1 className='sr-only'>Tournler: hosted CS2 tournaments</h1>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 py-8'>
				<div className='space-y-8'>
					{hero}
					<Suspense fallback={<UpNextSkeleton />}>
						<UpNextBlock />
					</Suspense>
					<Suspense fallback={<FeaturedSkeleton />}>
						<FeaturedSections />
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
