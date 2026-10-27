import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='min-h-screen' role='status' aria-busy='true' aria-live='polite'>
			<span className='sr-only'>Loading match…</span>
			<div className='border-b border-border' aria-hidden>
				<div className='mx-auto max-w-7xl px-4'>
					<Skeleton className='mt-5 h-5 w-64 bg-neutral-900' />
					<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-10 py-12'>
						<div className='flex items-center justify-end gap-5'>
							<Skeleton className='hidden h-8 w-40 bg-neutral-900 sm:block' />
							<Skeleton className='h-20 w-20 bg-neutral-900' />
						</div>
						<Skeleton className='h-16 w-32 bg-neutral-900 sm:w-40' />
						<div className='flex items-center gap-5'>
							<Skeleton className='h-20 w-20 bg-neutral-900' />
							<Skeleton className='hidden h-8 w-40 bg-neutral-900 sm:block' />
						</div>
					</div>
					<div className='flex gap-6 pb-4'>
						{[80, 96, 56].map((w) => (
							<Skeleton key={w} className='h-4 bg-neutral-900' style={{ width: w }} />
						))}
					</div>
				</div>
			</div>
			<div className='mx-auto grid max-w-7xl gap-4 px-4 pt-6 lg:grid-cols-[1fr_1.2fr_1fr]' aria-hidden>
				<Skeleton className='h-[340px] bg-neutral-900' />
				<Skeleton className='h-[340px] bg-neutral-900' />
				<Skeleton className='h-[340px] bg-neutral-900' />
			</div>
		</div>
	);
}
