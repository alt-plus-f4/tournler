import { FeaturedTournamentCard } from '@/components/FeaturedTournamentCard';
import { FeaturedNewsPostCard } from '@/components/FeaturedNewsPostCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { db } from '@/lib/db';
import { TournamentStatus } from '@prisma/client';
import Image from 'next/image';

const FALLBACK_BANNER = '/info-image.png';

async function getHomeContent() {
	const homepageSettings = await db.homepageSettings.findUnique({ where: { id: 1 } });
	const featuredSource = homepageSettings?.featuredSource ?? 'TOURNAMENTS';
	const featuredLayout = homepageSettings?.featuredLayout ?? 'GRID';

	const [curatedFeatured, upcoming, featuredNews] = await Promise.all([
		featuredSource !== 'NEWS'
			? db.cs2Tournament.findMany({
					where: { isSystem: false, isFeatured: true, status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } },
					orderBy: [{ featuredOrder: 'asc' }, { prizePool: 'desc' }],
					take: 6,
					include: { teams: true },
				})
			: Promise.resolve([]),
		db.cs2Tournament.findMany({
			where: { isSystem: false, status: TournamentStatus.UPCOMING },
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
						where: { isSystem: false, status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } },
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
					<section>
						<Card className='border-none'>
							<CardHeader className='mb-2 flex flex-row gap-1 p-0 space-y-0 select-none'>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row-reverse border '>
									<Image className='h5 md:h-8 w-auto object-contain' src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/zFLwAELOD15BjJSDMMNBWQ-D3exi76MOTrjZtz0Xp7UEQBS1oWnUJ.png' alt='G2' width={32} height={32} draggable={false} />
									<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-right'>
										<p className='font-style-1'>G2</p>
									</div>
								</div>
								<div className='flex flex-col justify-center rounded-small bg-canvas-95 px-3 py-4 text-center'>
									<p className='uppercase font-style-1'>Rewatch</p>
								</div>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row border '>
									<Image className='h-5 object-contain md:h-8' src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/4S22uk_gnZTiQiI-hhH4yp-RbEJga6u2dwOsFnlHUwTBmI01XKtj0.png' alt='HEROIC' width={32} height={32} draggable={false} />
									<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-left'>
										<p className='font-style-1'>HEROIC</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								<div className='relative aspect-video w-full'>
									<iframe
										className='w-full h-full rounded-lg'
										src='https://www.youtube-nocookie.com/embed/z0rBsvbMapU?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1'
										title='Live stream'
										allow='autoplay; encrypted-media; picture-in-picture'
										sandbox='allow-scripts allow-same-origin allow-presentation'
										referrerPolicy='no-referrer'
										frameBorder='0'
									/>
								</div>
							</CardContent>
						</Card>
					</section>

					{featuredSource !== 'NEWS' && (
						<section>
							<div className='flex items-center justify-between mb-8'>
								<h2 className='text-2xl font-bold tracking-tight'>Featured Tournaments</h2>
								<a href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
									All
								</a>
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
						<a href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
							All
						</a>
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
