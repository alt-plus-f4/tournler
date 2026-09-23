import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div role='status' aria-busy='true' aria-live='polite' className='mx-auto my-8 w-full max-w-5xl px-4'>
			<span className='sr-only'>Loading news…</span>
			<Skeleton className='h-10 w-40 bg-neutral-900' />
			<Skeleton className='mt-3 h-4 w-80 max-w-full bg-neutral-900' />
			<div className='mt-8 divide-y divide-border border-y border-border'>
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className='flex gap-6 py-5'>
						<Skeleton className='hidden aspect-[16/10] w-56 shrink-0 bg-neutral-900 sm:block' />
						<div className='flex-1 space-y-3'>
							<Skeleton className='h-6 w-3/4 bg-neutral-900' />
							<Skeleton className='h-4 w-full bg-neutral-900' />
							<Skeleton className='h-4 w-1/2 bg-neutral-900' />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
