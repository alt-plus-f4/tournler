import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='min-h-screen bg-black px-6 py-12'>
			<div className='mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6'>
				<div className='flex flex-col items-center gap-6'>
					<Skeleton className='h-24 w-24 rounded-full bg-white/10' />
					<div className='w-full space-y-3'>
						<Skeleton className='mx-auto h-8 w-48 bg-white/10' />
						<Skeleton className='mx-auto h-4 w-72 bg-white/10' />
					</div>
					<Skeleton className='h-10 w-40 bg-white/10' />
				</div>
			</div>
		</div>
	);
}
