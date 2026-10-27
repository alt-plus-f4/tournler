import { Suspense } from 'react';
import Link from 'next/link';
import { isoWeekNumber } from '@/lib/home/standings';
import { NewsListBlock, SpotlightBlock, RankingBlock, WeekGridBlock } from './blocks';
import { Eyebrow, OrganizerCta, SectionHead } from './parts';
import { NewsListSkeleton, RankingSkeleton, TournamentCardSkeleton, WeekSkeleton } from './skeletons';

/** WEEK: Monday to Sunday planner of the current week (UTC days), then the next tournament, top teams, news and organizer CTA. */
export function WeekHome() {
	const week = isoWeekNumber(new Date());

	return (
		<div className='container mx-auto max-w-[1400px] space-y-10 px-4 py-8 lg:px-8'>
			<div className='flex flex-wrap items-end justify-between gap-4'>
				<div>
					<Eyebrow className='mb-3'>Week {week}</Eyebrow>
					<h1 className='text-3xl font-black uppercase tracking-wide text-white sm:text-5xl'>This week in matches</h1>
				</div>
				<Link href='/matches' className='text-sm font-medium uppercase text-muted-foreground transition-colors hover:text-white'>
					All matches
				</Link>
			</div>
			<section aria-label='Matches this week'>
				<Suspense fallback={<WeekSkeleton />}>
					<WeekGridBlock />
				</Suspense>
			</section>
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
				<section aria-labelledby='week-next' className='min-w-0'>
					<SectionHead id='week-next' title='Next tournament' href='/tournaments' />
					<Suspense fallback={<TournamentCardSkeleton />}>
						<SpotlightBlock />
					</Suspense>
				</section>
				<section aria-labelledby='week-top' className='min-w-0'>
					<SectionHead id='week-top' title='Top teams' />
					<Suspense fallback={<RankingSkeleton rows={4} />}>
						<RankingBlock limit={4} />
					</Suspense>
				</section>
			</div>
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
				<section aria-labelledby='week-news' className='min-w-0'>
					<SectionHead id='week-news' title='Announcements' />
					<Suspense fallback={<NewsListSkeleton />}>
						<NewsListBlock />
					</Suspense>
				</section>
				<OrganizerCta />
			</div>
		</div>
	);
}
