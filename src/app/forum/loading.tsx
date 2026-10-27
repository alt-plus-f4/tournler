import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='container mx-auto max-w-[1100px] px-4 py-8 lg:px-8'>
			<div className='flex flex-wrap items-end justify-between gap-4'>
				<div>
					<p className='mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Community</p>
					<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Forum</h1>
					<Skeleton className='mt-3 h-4 w-24 rounded-sm bg-neutral-900' />
				</div>
				<Skeleton className='h-10 w-32 rounded-md bg-neutral-900' />
			</div>
			<div className='-mx-4 mt-6 overflow-hidden px-4 pb-1' aria-hidden>
				<div className='flex min-w-max gap-2'>
					{[44, 84, 96, 72, 88].map((w, i) => (
						<Skeleton key={i} className='h-9 rounded-full bg-neutral-900' style={{ width: w }} />
					))}
				</div>
			</div>
			<div role='status' aria-busy='true' aria-live='polite' className='mt-4 overflow-hidden rounded-md border border-border'>
				<span className='sr-only'>Loading threads…</span>
				<div className='h-9 border-b border-border bg-muted/40' />
				<div className='divide-y divide-border'>
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className='flex items-center gap-4 px-3 py-3'>
							<Skeleton className='hidden h-4 w-8 rounded-sm bg-neutral-900 sm:block' />
							<Skeleton className='h-4 flex-1 rounded-sm bg-neutral-900' style={{ maxWidth: `${60 - (i % 3) * 12}%` }} />
							<Skeleton className='ml-auto hidden h-4 w-24 rounded-sm bg-neutral-900 sm:block' />
							<Skeleton className='hidden h-4 w-10 rounded-sm bg-neutral-900 sm:block' />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
