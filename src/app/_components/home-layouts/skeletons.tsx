import { Skeleton } from '@/components/ui/skeleton';

// Shape-matched Suspense fallbacks for the homepage layouts: same borders and fixed heights as the
// blocks they stand in for, so streaming a block in does not shove the page.

const sk = 'rounded-sm bg-neutral-900';

export function HeroSkeleton() {
	return <div aria-hidden className='min-h-[220px] rounded-md border border-border bg-black sm:min-h-[260px]' />;
}

export function BannerSkeleton() {
	return (
		<div aria-hidden className='grid min-h-[360px] gap-8 rounded-lg border border-border bg-black p-6 sm:p-10 lg:min-h-[320px] lg:grid-cols-[1.3fr_1fr]'>
			<div className='space-y-4 self-end'>
				<Skeleton className={`h-4 w-40 ${sk}`} />
				<Skeleton className={`h-14 w-3/4 ${sk}`} />
				<Skeleton className={`h-5 w-2/3 ${sk}`} />
			</div>
			<div className='space-y-4 rounded-md border border-border p-5'>
				<Skeleton className={`h-4 w-32 ${sk}`} />
				<Skeleton className={`h-16 w-full ${sk}`} />
				<Skeleton className={`h-8 w-full ${sk}`} />
			</div>
		</div>
	);
}

export function StatStripSkeleton() {
	return (
		<div aria-hidden className='grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4'>
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className='space-y-2 bg-black p-4'>
					<Skeleton className={`h-3 w-16 ${sk}`} />
					<Skeleton className={`h-7 w-20 ${sk}`} />
				</div>
			))}
		</div>
	);
}

export function RankingSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div aria-hidden>
			<div className='divide-y divide-border overflow-hidden rounded-md border border-border bg-black'>
				<div className='h-9 bg-neutral-950' />
				{Array.from({ length: rows }).map((_, i) => (
					<div key={i} className='flex h-[60px] items-center gap-3 px-4'>
						<Skeleton className={`h-5 w-5 ${sk}`} />
						<Skeleton className={`h-8 w-8 ${sk}`} />
						<Skeleton className={`h-4 flex-1 ${sk}`} />
						<Skeleton className={`h-4 w-10 ${sk}`} />
					</div>
				))}
			</div>
		</div>
	);
}

export function WeekSkeleton() {
	return (
		<div aria-hidden className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'>
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className='min-h-[220px] rounded-md border border-border bg-black lg:min-h-[300px]'>
					<div className='border-b border-border px-3.5 py-3'>
						<Skeleton className={`h-5 w-24 ${sk}`} />
					</div>
					<div className='space-y-2 p-3'>
						<Skeleton className={`h-3 w-16 ${sk}`} />
						<Skeleton className={`h-4 w-3/4 ${sk}`} />
						<Skeleton className={`h-4 w-2/3 ${sk}`} />
					</div>
				</div>
			))}
		</div>
	);
}

export function ThisWeekSkeleton() {
	return (
		<div aria-hidden>
			<div className='divide-y divide-border overflow-hidden rounded-md border border-border bg-black'>
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className='flex h-14 items-center gap-3 px-4'>
						<Skeleton className={`h-3 w-14 ${sk}`} />
						<Skeleton className={`h-4 flex-1 ${sk}`} />
						<Skeleton className={`h-3 w-12 ${sk}`} />
					</div>
				))}
			</div>
		</div>
	);
}

export function NewsListSkeleton() {
	return (
		<div aria-hidden>
			<div className='space-y-3'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className='flex h-[106px] gap-3.5 rounded-md border border-border bg-black p-3'>
						<div className='h-20 w-[110px] shrink-0 rounded-sm bg-neutral-900' />
						<div className='flex-1 space-y-2 pt-1'>
							<Skeleton className={`h-4 w-full ${sk}`} />
							<Skeleton className={`h-3 w-20 ${sk}`} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function TickerSkeleton() {
	return (
		<div aria-hidden className='flex gap-2.5 overflow-hidden'>
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className='h-[92px] min-w-[230px] shrink-0 rounded-md border border-border bg-black' />
			))}
		</div>
	);
}

export function TournamentCardSkeleton() {
	return <div aria-hidden className='min-h-[300px] rounded-md border border-border bg-black' />;
}

/** MODERN "This week": pill tabs + a list of 4 match rows. */
export function ModernWeekSkeleton() {
	return (
		<div aria-hidden className='flex flex-col gap-5'>
			<div className='flex gap-1.5'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='h-[34px] w-24 rounded-full border border-border' />
				))}
			</div>
			<div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-black'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='flex h-[60px] items-center gap-4 px-5'>
						<Skeleton className={`h-4 w-12 ${sk}`} />
						<Skeleton className={`h-4 flex-1 ${sk}`} />
						<Skeleton className={`h-4 w-10 ${sk}`} />
						<Skeleton className={`h-4 flex-1 ${sk}`} />
					</div>
				))}
			</div>
		</div>
	);
}

/** MODERN featured tournaments: one large card beside two stacked. */
export function ModernFeaturedSkeleton() {
	return (
		<div aria-hidden className='grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
			<div className='min-h-[360px] rounded-2xl border border-border bg-neutral-900 lg:min-h-[440px]' />
			<div className='grid grid-cols-1 gap-5 lg:grid-rows-2'>
				<div className='min-h-[210px] rounded-2xl border border-border bg-neutral-900' />
				<div className='min-h-[210px] rounded-2xl border border-border bg-neutral-900' />
			</div>
		</div>
	);
}

/** MODERN news: a 16:9 lead story beside a list of headlines. */
export function ModernNewsSkeleton() {
	return (
		<div aria-hidden className='flex flex-wrap gap-10'>
			<div className='flex min-w-0 flex-[999_1_520px] flex-col gap-4'>
				<div className='aspect-video w-full rounded-xl bg-neutral-900' />
				<Skeleton className={`h-3 w-16 ${sk}`} />
				<Skeleton className={`h-7 w-3/4 ${sk}`} />
			</div>
			<div className='flex min-w-0 flex-[1_1_360px] flex-col'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='space-y-2 border-t border-border py-5 last:border-b'>
						<Skeleton className={`h-3 w-14 ${sk}`} />
						<Skeleton className={`h-5 w-full ${sk}`} />
					</div>
				))}
			</div>
		</div>
	);
}
