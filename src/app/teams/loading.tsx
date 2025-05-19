import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { FallbackCards } from '@/components/FallbackCards';
import { CircleUser } from 'lucide-react';

export default function Loading() {
	return (
		<div className='w-[78%] mx-auto my-4'>
			{/* Page title skeleton */}
			<div className='flex justify-center my-4'>
				<Skeleton className='h-12 w-3/4 max-w-[600px]' />
			</div>

			{/* Alert skeleton */}
			<Alert className='md:flex'>
				<CircleUser className='h-4 w-4' />
				<div className='w-fit'>
					<Skeleton className='h-5 w-32 mb-2' />
					<Skeleton className='h-4 w-64' />
				</div>
			</Alert>

			{/* Teams heading skeleton */}
			<div className='flex items-center'>
				<Skeleton className='h-8 w-32 my-4' />
			</div>

			{/* Teams grid skeleton using FallbackCards */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-evenly border-l-2 ml-4 pl-4 border-black dark:border-white'>
				<FallbackCards />
			</div>
		</div>
	);
}
