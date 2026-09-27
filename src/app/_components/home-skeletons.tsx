import { Skeleton } from '@/components/ui/skeleton';

// Homepage Suspense fallbacks. Each one reserves the footprint of the section it stands in for
// (same borders, paddings and fixed heights), so streaming a section in doesn't shove the page.

/** RewatchPlayer: header row, 16:9 poster, footer row. */
export function HeroSkeleton() {
	return (
		<div role='status' aria-busy='true' className='overflow-hidden rounded-md border border-border bg-black'>
			<span className='sr-only'>Loading broadcast…</span>
			<div className='flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4'>
				<Skeleton className='h-6 w-40 rounded-sm bg-neutral-900 sm:h-8 sm:w-64' />
				<Skeleton className='h-3 w-16 rounded-sm bg-neutral-900' />
			</div>
			<div className='aspect-video w-full bg-neutral-950' />
			<div className='flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6'>
				<Skeleton className='h-4 w-28 rounded-sm bg-neutral-900' />
				<Skeleton className='h-4 w-24 rounded-sm bg-neutral-900' />
			</div>
		</div>
	);
}

/** UpNext: heading row + a few 56px rows. */
export function UpNextSkeleton() {
	return (
		<div aria-hidden>
			<div className='mb-3 flex items-center justify-between'>
				<Skeleton className='h-7 w-28 rounded-sm bg-neutral-900' />
				<Skeleton className='h-5 w-24 rounded-sm bg-neutral-900' />
			</div>
			<div className='divide-y divide-border overflow-hidden rounded-md border border-border bg-black'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className='flex min-h-14 items-center gap-3 px-4 py-3 sm:px-5'>
						<div className='flex-1 space-y-1.5'>
							<Skeleton className='h-4 w-48 max-w-full rounded-sm bg-neutral-900' />
							<Skeleton className='h-3 w-28 rounded-sm bg-neutral-900' />
						</div>
						<Skeleton className='h-4 w-20 rounded-sm bg-neutral-900' />
					</div>
				))}
			</div>
		</div>
	);
}

/** One featured section: heading row + a grid of FeaturedTournamentCard-sized blocks. */
export function FeaturedSkeleton() {
	return (
		<div aria-hidden>
			<div className='mb-8 flex items-center justify-between'>
				<Skeleton className='h-8 w-60 rounded-sm bg-neutral-900' />
				<Skeleton className='h-6 w-8 rounded-sm bg-neutral-900' />
			</div>
			<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className='overflow-hidden rounded-md border border-border bg-card'>
						<div className='h-32 w-full bg-neutral-900' />
						<div className='space-y-2 p-4'>
							<Skeleton className='h-7 w-3/4 rounded-sm bg-neutral-900' />
							<Skeleton className='h-5 w-1/2 rounded-sm bg-neutral-900' />
							<Skeleton className='h-5 w-1/3 rounded-sm bg-neutral-900' />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/** Home sidebar UpcomingTournament cards (min-h-[200px]). */
export function UpcomingSkeleton({ count }: { count: number }) {
	return (
		<>
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} aria-hidden className='flex min-h-[200px] flex-col overflow-hidden rounded-md border border-border bg-black'>
					<div className='h-24 w-full bg-neutral-900' />
					<div className='flex flex-1 flex-col items-center gap-2 p-3'>
						<Skeleton className='h-5 w-40 rounded-sm bg-neutral-900' />
						<Skeleton className='h-3 w-24 rounded-sm bg-neutral-900' />
					</div>
				</div>
			))}
		</>
	);
}

/** ForumHomeBlock: heading row + list of 36px thread rows. */
export function ForumBlockSkeleton() {
	return (
		<div aria-hidden className='pt-4'>
			<div className='mb-3 flex items-center justify-between'>
				<Skeleton className='h-8 w-24 rounded-sm bg-neutral-900' />
				<Skeleton className='h-6 w-8 rounded-sm bg-neutral-900' />
			</div>
			<div className='divide-y divide-border overflow-hidden rounded-md border border-border'>
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className='flex h-9 items-center gap-3 px-3'>
						<Skeleton className='h-3.5 flex-1 rounded-sm bg-neutral-900' />
						<Skeleton className='h-3 w-4 rounded-sm bg-neutral-900' />
					</div>
				))}
			</div>
		</div>
	);
}
