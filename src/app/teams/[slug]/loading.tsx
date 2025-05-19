import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function Loading() {
	return (
		<Card className='w-5/6 mx-auto align-center mt-12 h-[750px] mb-8'>
			{/* Banner skeleton */}
			<CardHeader className='relative p-0 w-full h-[60%] space-y-0 overflow-hidden rounded-t-xl'>
				<Skeleton className='w-full h-full' />

				{/* Back button skeleton */}
				<div className='absolute top-1 left-1'>
					<Skeleton className='h-9 w-9 rounded-md' />
				</div>
			</CardHeader>

			<CardContent className='p-3'>
				{/* Team name header skeleton */}
				<div className='flex items-center border-b-2 border-gray-800 pb-2 mb-2'>
					<Skeleton className='h-8 w-8 mr-1' />
					<Skeleton className='h-8 w-64' />

					{/* Action buttons skeleton */}
					<div className='ml-auto flex flex-row gap-2'>
						<Skeleton className='h-9 w-24' />
						<Skeleton className='h-9 w-32' />
					</div>
				</div>

				{/* Matches section skeleton */}
				<div className='flex mx-1 mt-2'>
					<Skeleton className='h-6 w-24' />
				</div>

				{/* Match list skeleton
				<div className='mt-4 space-y-3'>
					{Array(3)
						.fill(0)
						.map((_, i) => (
							<div
								key={i}
								className='border rounded-lg p-3 flex justify-between items-center'
							>
								<div className='flex items-center'>
									<Skeleton className='h-10 w-10 rounded-full' />
									<Skeleton className='h-5 w-32 ml-2' />
								</div>
								<Skeleton className='h-5 w-20' />
								<div className='flex items-center'>
									<Skeleton className='h-5 w-32 mr-2' />
									<Skeleton className='h-10 w-10 rounded-full' />
								</div>
							</div>
						))}
				</div> */}
			</CardContent>
		</Card>
	);
}
