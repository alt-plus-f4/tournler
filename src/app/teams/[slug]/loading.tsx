import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div role='status' aria-busy='true' aria-live='polite' className='mx-auto my-8 w-full px-4 sm:w-5/6 sm:px-0'>
			<span className='sr-only'>Loading team…</span>
			<Skeleton className='h-[240px] w-full rounded-md bg-neutral-900 sm:h-[420px]' />
			<Skeleton className='mt-6 h-9 w-64 max-w-full bg-neutral-900' />
			<Skeleton className='mt-10 h-4 w-24 bg-neutral-900' />
			<div className='mt-3 space-y-2'>
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
				))}
			</div>
		</div>
	);
}
