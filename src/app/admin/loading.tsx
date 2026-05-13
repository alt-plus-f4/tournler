import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='mx-auto mt-12 flex w-[80%] flex-col gap-6'>
			<Skeleton className='h-12 w-72' />
			<Skeleton className='h-12 w-full rounded-lg' />

			<div className='grid gap-6 lg:grid-cols-3'>
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className='rounded-2xl border border-white/10 bg-white/5 p-5'>
						<Skeleton className='mb-4 h-6 w-1/2' />
						<Skeleton className='h-64 w-full rounded-xl' />
						<Skeleton className='mt-4 h-4 w-2/3' />
					</div>
				))}
			</div>
		</div>
	);
}
