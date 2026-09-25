import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='mx-auto my-8 w-full max-w-5xl px-4'>
			{/* Real heading/copy, not a skeleton: this part of the page is static, so showing it as
			    "loading" would be dishonest about what's actually still in flight (the post list). */}
			<div>
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>News</h1>
				<p className='mt-2 text-sm text-muted-foreground'>Announcements, patch notes and tournament news from the Tournler team.</p>
			</div>
			<div role='status' aria-busy='true' aria-live='polite' className='mt-8 divide-y divide-border border-y border-border'>
				<span className='sr-only'>Loading news…</span>
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className='flex gap-6 py-5' aria-hidden>
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
