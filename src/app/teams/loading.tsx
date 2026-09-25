import { Skeleton } from '@/components/ui/skeleton';
import { HubSubnavSkeleton } from '@/components/shell/HubSubnav';

export default function Loading() {
	return (
		<>
			<HubSubnavSkeleton active='teams' />
			<div role='status' aria-busy='true' aria-live='polite' className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
				<span className='sr-only'>Loading teams…</span>
				{/* Real heading, not a skeleton: it's always "Teams" — the game-specific blurb below still
				    is one, since which game is active isn't known yet here. */}
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Teams</h1>
				<Skeleton className='mt-3 h-4 w-72 max-w-full bg-neutral-900' />
				<Skeleton className='mt-6 h-14 w-full bg-neutral-900' />
				<div className='mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className='h-[210px] w-full rounded-md bg-neutral-900' />
					))}
				</div>
			</div>
		</>
	);
}
