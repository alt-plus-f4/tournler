import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='min-h-screen px-6 py-10 md:px-12'>
			<div className='mx-auto flex w-full max-w-6xl flex-col gap-8'>
				<div className='space-y-4'>
					<Skeleton className='h-12 w-3/5 max-w-xl' />
					<Skeleton className='h-6 w-2/5 max-w-md' />
				</div>

				<div className='grid gap-4 md:grid-cols-3'>
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={index} className='rounded-2xl border border-white/10 bg-white/5 p-5'>
							<Skeleton className='mb-4 h-40 w-full rounded-xl' />
							<Skeleton className='h-5 w-3/4' />
							<Skeleton className='mt-3 h-4 w-1/2' />
						</div>
					))}
				</div>

				<div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
					<Skeleton className='h-80 rounded-2xl' />
					<Skeleton className='h-80 rounded-2xl' />
				</div>
			</div>
		</div>
	);
}
