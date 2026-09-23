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
import Link from 'next/link';
import { TournamentStatus } from '@prisma/client';

const FALLBACK_BANNER = '/info-image.png';
const UPCOMING_COUNT = 3;

async function getHomeContent() {
	const now = new Date();
	// UPCOMING tournaments whose start date has passed are still shown (the cards label them
	// "Start pending"), since the organizer hasn't started or cancelled them yet.
	const activeTournament = { status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } };
	const homepageSettings = await db.homepageSettings.findUnique({ where: { id: 1 } });
	const featuredSource = homepageSettings?.featuredSource ?? 'TOURNAMENTS';
	const featuredLayout = homepageSettings?.featuredLayout ?? 'GRID';
	const showForumPosts = homepageSettings?.showForumPosts ?? true;

	const [curatedFeatured, upcomingFuture, featuredNews, forumThreads] = await Promise.all([
		featuredSource !== 'NEWS'
			? db.cs2Tournament.findMany({
					where: { isSystem: false, isFeatured: true, ...activeTournament },
					orderBy: [{ featuredOrder: 'asc' }, { prizePool: 'desc' }],
					take: 6,
					include: { teams: true },
				})
			: Promise.resolve([]),
		db.cs2Tournament.findMany({
			where: { isSystem: false, status: TournamentStatus.UPCOMING, startDate: { gte: now } },
			orderBy: { startDate: 'asc' },
			take: UPCOMING_COUNT,
			include: { teams: true },
		}),
		featuredSource !== 'TOURNAMENTS'
			? db.newsPost.findMany({
					where: { isFeatured: true },
					orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
					take: 6,
				})
			: Promise.resolve([]),
		showForumPosts ? recentForumThreads(8) : Promise.resolve(null),
	]);

	// Nothing curated yet — fall back to the original prize-pool heuristic so the
	// section isn't empty the moment this feature ships with no admin curation done.
	const featuredTournaments =
		curatedFeatured.length > 0
			? curatedFeatured
			: featuredSource !== 'NEWS'
				? await db.cs2Tournament.findMany({
						where: { isSystem: false, ...activeTournament },
						orderBy: { prizePool: 'desc' },
						take: 6,
						include: { teams: true },
					})
				: [];

	// Genuinely upcoming first (soonest first); top up with overdue ones (most recently due first).
	const upcoming =
		upcomingFuture.length >= UPCOMING_COUNT
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

	return { featuredTournaments, featuredNews, upcoming, featuredSource, featuredLayout, forumThreads, rewatch: resolveRewatch(homepageSettings) };
}

export default async function Page() {
	const [{ featuredTournaments, featuredNews, upcoming, featuredSource, featuredLayout, forumThreads, rewatch }, liveMatches, upNext] = await Promise.all([getHomeContent(), getLiveMatches(), getUpNext()]);
	const isLive = liveMatches.length > 0;
	const layoutClass = featuredLayout === 'CAROUSEL' ? 'flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';
	const itemClass = featuredLayout === 'CAROUSEL' ? 'min-w-[280px] max-w-[320px] snap-start shrink-0' : '';

	return (
		<div className='container mx-auto max-w-[1400px] px-4 lg:px-8'>
			<h1 className='sr-only'>Tournler: hosted CS2 tournaments</h1>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 py-8'>
				<div className='space-y-8'>
					{/* Live scoreboard leads when a server reports a match in progress; otherwise the VOD is the hero. */}
					{isLive ? <OnAirPanel matches={liveMatches} /> : <RewatchPlayer rewatch={rewatch} />}
					<UpNext rows={upNext} />
					{isLive && <RewatchPlayer rewatch={rewatch} />}

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
				</div>

				<div className='lg:sticky lg:top-16 space-y-4 h-fit'>
					<div className='flex items-center justify-between mb-6'>
						<h2 className='text-2xl font-bold tracking-tight'>Upcoming</h2>
						<Link href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
							All
						</Link>
					</div>
					<div className='space-y-4'>
						{upcoming.length > 0 ? (
							upcoming.map((tournament) => <UpcomingTournament key={tournament.id} id={tournament.id} name={tournament.name} status={tournament.status} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool} teams={tournament.teams} location={tournament.location} teamCapacity={tournament.teamCapacity} isHomePage />)
						) : (
							<p className='text-sm text-muted-foreground'>Nothing scheduled yet.</p>
						)}
					</div>
					{/* Hidden entirely (null) when an admin turns off "Show recent forum posts" in /admin/featured. */}
					{forumThreads && <ForumHomeBlock threads={forumThreads} />}
				</div>
			</div>
		</div>
	);
}
