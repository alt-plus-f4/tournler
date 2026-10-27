import { Suspense } from 'react';
import { FeaturedTournamentsBlock, Hero, NewsListBlock, RankingBlock, SeasonBannerBlock, StatStripBlock } from './blocks';
import { SectionHead } from './parts';
import { HeroSkeleton, NewsListSkeleton, RankingSkeleton, StatStripSkeleton } from './skeletons';

/** SEASON: next-tournament banner with countdown, stat strip, live hero + featured, team ranking + news. */
export async function SeasonHome() {
	// The banner holds the LCP image and its query is cached, so it is awaited up front like the classic hero.
	const banner = await SeasonBannerBlock();

	return (
		<div className='container mx-auto max-w-[1400px] space-y-6 px-4 py-8 lg:px-8'>
			{banner}
			<Suspense fallback={<StatStripSkeleton />}>
				<StatStripBlock />
			</Suspense>
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]'>
				<div className='min-w-0 space-y-10'>
					<Suspense fallback={<HeroSkeleton />}>
						<Hero />
					</Suspense>
					<section aria-labelledby='season-featured'>
						<SectionHead id='season-featured' title='Featured tournaments' href='/tournaments' linkLabel='All tournaments' />
						<Suspense fallback={<FeaturedSkeletonBody />}>
							<FeaturedTournamentsBlock columns='sm:grid-cols-2 xl:grid-cols-3' />
						</Suspense>
					</section>
				</div>
				<aside className='min-w-0 space-y-8'>
					<section aria-labelledby='season-ranking'>
						<SectionHead id='season-ranking' title='Team ranking' />
						<Suspense fallback={<RankingSkeleton />}>
							<RankingBlock limit={5} />
						</Suspense>
					</section>
					<section aria-labelledby='season-news'>
						<SectionHead id='season-news' title='Announcements' />
						<Suspense fallback={<NewsListSkeleton />}>
							<NewsListBlock />
						</Suspense>
					</section>
				</aside>
			</div>
		</div>
	);
}

/** Card grid only (the section head is already rendered above it). */
function FeaturedSkeletonBody() {
	return (
		<div aria-hidden className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className='h-[200px] overflow-hidden rounded-md border border-border bg-card'>
					<div className='h-32 w-full bg-neutral-900' />
				</div>
			))}
		</div>
	);
}
