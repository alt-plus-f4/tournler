import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<article role='status' aria-busy='true' aria-live='polite' className='mx-auto my-8 w-full max-w-4xl px-4'>
			<span className='sr-only'>Loading post…</span>
			<div aria-hidden>
				<Skeleton className='mb-5 h-4 w-20 bg-neutral-900' />
				<p className='mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>News</p>
				<Skeleton className='h-9 w-4/5 bg-neutral-900 md:h-12' />
				<div className='mt-4 flex items-center gap-3'>
					<Skeleton className='h-8 w-8 rounded-full bg-neutral-900' />
					<Skeleton className='h-4 w-48 bg-neutral-900' />
				</div>
				<Skeleton className='mt-8 aspect-[16/9] w-full bg-neutral-900' />
				<div className='mx-auto mt-10 max-w-[66ch] space-y-3'>
					<Skeleton className='h-4 w-full bg-neutral-900' />
					<Skeleton className='h-4 w-full bg-neutral-900' />
					<Skeleton className='h-4 w-11/12 bg-neutral-900' />
					<Skeleton className='h-4 w-full bg-neutral-900' />
					<Skeleton className='h-4 w-2/3 bg-neutral-900' />
				</div>
			</div>
		</article>
	);
}
