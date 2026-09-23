import { FeaturedTournamentCard } from '@/components/FeaturedTournamentCard';
import { FeaturedNewsPostCard } from '@/components/FeaturedNewsPostCard';
import { OnAirPanel } from '@/components/OnAirPanel';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { db } from '@/lib/db';
import Link from 'next/link';
import { TournamentStatus } from '@prisma/client';

const FALLBACK_BANNER = '/info-image.png';

async function getHomeContent() {
	const now = new Date();
	// An UPCOMING tournament whose start date has already passed is stale data (never started or
	// never closed out), not something to advertise as upcoming.
	const activeTournament = { OR: [{ status: TournamentStatus.ONGOING }, { status: TournamentStatus.UPCOMING, startDate: { gte: now } }] };
	const homepageSettings = await db.homepageSettings.findUnique({ where: { id: 1 } });
	const featuredSource = homepageSettings?.featuredSource ?? 'TOURNAMENTS';
	const featuredLayout = homepageSettings?.featuredLayout ?? 'GRID';

	const [curatedFeatured, upcoming, featuredNews] = await Promise.all([
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
			take: 3,
			include: { teams: true },
		}),
		featuredSource !== 'TOURNAMENTS'
			? db.newsPost.findMany({
					where: { isFeatured: true },
					orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
					take: 6,
				})
			: Promise.resolve([]),
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

	return { featuredTournaments, featuredNews, upcoming, featuredSource, featuredLayout };
}

export default async function Page() {
	const { featuredTournaments, featuredNews, upcoming, featuredSource, featuredLayout } = await getHomeContent();
	const layoutClass = featuredLayout === 'CAROUSEL' ? 'flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';
	const itemClass = featuredLayout === 'CAROUSEL' ? 'min-w-[280px] max-w-[320px] snap-start shrink-0' : '';

	return (
		<div className='container mx-auto px-4 max-w-[1400px]'>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 p-8'>
				<div className='space-y-8'>
					<OnAirPanel />

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
											<FeaturedTournamentCard id={tournament.id} name={tournament.name} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool ?? 0} location={tournament.location} />
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
											<FeaturedNewsPostCard title={post.title} blurb={post.blurb} imageUrl={post.imageUrl} link={post.link} publishedAt={post.publishedAt.toISOString()} />
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
					<div className='space-y-4 overflow-hidden'>
						{upcoming.length > 0 ? (
							upcoming.map((tournament) => <UpcomingTournament key={tournament.id} id={tournament.id} name={tournament.name} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool ?? 0} teams={tournament.teams} location={tournament.location} teamCapacity={tournament.teamCapacity} isHomePage />)
						) : (
							<p className='text-sm text-muted-foreground'>Nothing scheduled yet.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
