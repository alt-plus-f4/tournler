import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='container mx-auto max-w-[900px] px-4 py-8'>
			<div role='status' aria-busy='true' aria-live='polite'>
				<span className='sr-only'>Loading thread…</span>
				<Skeleton className='h-5 w-44 rounded-sm bg-neutral-900' />
				<div className='mt-4 rounded-md border border-border bg-card/40 p-4 sm:p-5'>
					<div className='flex gap-3'>
						<Skeleton className='h-28 w-10 rounded-sm bg-neutral-900 sm:w-8' />
						<div className='flex-1 space-y-3'>
							<Skeleton className='h-8 w-3/4 rounded-sm bg-neutral-900' />
							<div className='flex items-center gap-3'>
								<Skeleton className='h-8 w-8 rounded-full bg-neutral-900' />
								<Skeleton className='h-4 w-40 rounded-sm bg-neutral-900' />
							</div>
						</div>
					</div>
					<div className='mt-5 space-y-2'>
						<Skeleton className='h-4 w-full rounded-sm bg-neutral-900' />
						<Skeleton className='h-4 w-11/12 rounded-sm bg-neutral-900' />
						<Skeleton className='h-4 w-2/3 rounded-sm bg-neutral-900' />
					</div>
				</div>
				<Skeleton className='mt-8 h-4 w-28 rounded-sm bg-neutral-900' />
				<div className='mt-4 space-y-5'>
					{[0, 1, 2, 0].map((depth, i) => (
						<div key={i} className='space-y-2' style={{ paddingLeft: `${depth * 1.5}rem` }}>
							<Skeleton className='h-5 w-48 rounded-sm bg-neutral-900' />
							<Skeleton className='ml-7 h-4 w-3/4 rounded-sm bg-neutral-900' />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
