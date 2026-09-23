import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder shaped like the profile hero + tab bar + overview grid, so the page doesn't jump when data lands. */
export function ProfileSkeleton() {
	return (
		<div className='min-h-screen bg-black pb-16 pt-6 sm:pt-8'>
			<div className='mx-auto max-w-6xl px-4'>
				<div className='border border-border bg-neutral-950 px-5 pb-6 pt-24 sm:px-8 sm:pt-28'>
					<div className='flex flex-col gap-6 sm:flex-row sm:items-end'>
						<Skeleton className='h-24 w-24 shrink-0 rounded-md bg-neutral-800 sm:h-28 sm:w-28' />
						<div className='flex-1 space-y-3'>
							<Skeleton className='h-9 w-56 rounded-sm bg-neutral-800 sm:h-12 sm:w-80' />
							<Skeleton className='h-4 w-48 rounded-sm bg-neutral-800' />
						</div>
						<Skeleton className='h-[108px] w-full rounded-md bg-neutral-900 sm:w-72' />
					</div>
				</div>
				<div className='flex h-12 gap-6 border-x border-b border-border bg-neutral-950 px-5'>
					<Skeleton className='my-auto h-3 w-16 rounded-sm bg-neutral-800' />
					<Skeleton className='my-auto h-3 w-16 rounded-sm bg-neutral-800' />
					<Skeleton className='my-auto h-3 w-16 rounded-sm bg-neutral-800' />
				</div>
				<div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
					<div className='space-y-6'>
						<Skeleton className='h-36 w-full rounded-md bg-neutral-900' />
						<Skeleton className='h-64 w-full rounded-md bg-neutral-900' />
					</div>
					<div className='space-y-6'>
						<Skeleton className='h-24 w-full rounded-md bg-neutral-900' />
						<Skeleton className='h-40 w-full rounded-md bg-neutral-900' />
					</div>
				</div>
			</div>
		</div>
	);
}
