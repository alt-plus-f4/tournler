import { Suspense } from 'react';
import Link from 'next/link';
import { FeaturedTournamentsBlock, Hero, NewsListBlock, RankingBlock, ThisWeekBlock } from './blocks';
import { OrganizerCta, SectionHead } from './parts';
import { NewsListSkeleton, RankingSkeleton, ThisWeekSkeleton } from './skeletons';

/** CAMPUS: live/rewatch hero, team ranking beside this week's matches, featured tournaments, news and organizer CTA. */
export async function CampusHome() {
	// Holds the LCP image/scoreboard; cached query, so awaited up front like the classic hero.
	const hero = await Hero();

	return (
		<div className='container mx-auto max-w-[1400px] space-y-10 px-4 py-8 lg:px-8'>
			<h1 className='sr-only'>Tournler: school tournaments, live scores and team standings</h1>
			{hero}
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]'>
				<section aria-labelledby='campus-ranking' className='min-w-0'>
					<SectionHead id='campus-ranking' title='Team standings' />
					<Suspense fallback={<RankingSkeleton rows={7} />}>
						<RankingBlock limit={7} />
					</Suspense>
				</section>
				<section aria-labelledby='campus-week' className='min-w-0'>
					<SectionHead id='campus-week' title='This week' href='/matches' linkLabel='All matches' />
					<Suspense fallback={<ThisWeekSkeleton />}>
						<ThisWeekBlock />
					</Suspense>
				</section>
			</div>
			<section aria-labelledby='campus-featured'>
				<SectionHead id='campus-featured' title='Featured tournaments' href='/tournaments' />
				<Suspense
					fallback={
						<div aria-hidden className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className='h-[200px] overflow-hidden rounded-md border border-border bg-card'>
									<div className='h-32 w-full bg-neutral-900' />
								</div>
							))}
						</div>
					}
				>
					<FeaturedTournamentsBlock />
				</Suspense>
			</section>
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]'>
				<section aria-labelledby='campus-news' className='min-w-0'>
					<SectionHead id='campus-news' title='Announcements' />
					<Suspense fallback={<NewsListSkeleton />}>
						<NewsListBlock />
					</Suspense>
				</section>
				<OrganizerCta />
			</div>
			<p className='text-center text-sm text-muted-foreground'>
				New here?{' '}
				<Link href='/information' className='font-medium text-white underline underline-offset-4 hover:text-neutral-300'>
					See how a tournament works
				</Link>
			</p>
		</div>
	);
}
