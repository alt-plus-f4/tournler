import { AdminPage } from '@/components/admin/AdminPage';
import { Skeleton } from '@/components/ui/skeleton';

/** Shared by every /admin screen (the title differs per page, so the header is a placeholder). */
export default function Loading() {
	return (
		<AdminPage>
			<div role='status' aria-busy='true' aria-live='polite'>
				<span className='sr-only'>Loading…</span>
				<div className='mb-6' aria-hidden>
					<p className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Admin</p>
					<Skeleton className='mt-2 h-9 w-56 bg-muted' />
					<Skeleton className='mt-2 h-4 w-72 max-w-full bg-muted' />
				</div>
				<div className='mb-4 flex flex-col gap-3 sm:flex-row' aria-hidden>
					<Skeleton className='h-10 w-full bg-muted sm:max-w-sm' />
				</div>
				<div className='divide-y divide-border overflow-hidden rounded-lg border border-border bg-card' aria-hidden>
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className='flex items-center gap-4 px-4 py-3.5'>
							<Skeleton className='h-8 w-8 rounded-full bg-muted' />
							<Skeleton className='h-4 w-40 bg-muted' />
							<Skeleton className='ml-auto hidden h-4 w-24 bg-muted sm:block' />
							<Skeleton className='h-4 w-16 bg-muted' />
						</div>
					))}
				</div>
			</div>
		</AdminPage>
	);
}
