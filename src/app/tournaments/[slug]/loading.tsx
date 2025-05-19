import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function Loading() {
	return (
		<Card className='w-5/6 mx-auto mt-8 border-none'>
			<CardHeader className='relative p-0 w-full h-[300px] space-y-0 rounded-t-xl'>
				{/* Banner skeleton */}
				<Skeleton className='absolute inset-0 w-full h-full' />

				{/* Back button skeleton */}
				<div
					className={cn(
						'absolute top-2 left-2 z-10',
						buttonVariants({ variant: 'outline' })
					)}
				>
					<Skeleton className='h-4 w-4' />
				</div>

				{/* Gradient overlay skeleton */}
				<div className='absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-black/50 to-transparent'></div>

				{/* Tournament title and organizer skeleton */}
				<div className='absolute inset-4 flex items-end justify-start'>
					<div className='flex flex-col'>
						<Skeleton className='h-8 w-64 mb-2' />
						<div className='flex flex-row items-center'>
							<Skeleton className='h-4 w-40' />
							<Skeleton className='h-4 w-4 ml-1 rounded-full' />
						</div>
					</div>
				</div>

				{/* Timer and button skeleton */}
				<div className='absolute inset-4 sm:inset-10 flex items-end justify-end flex-col text-center z-10'>
					<Skeleton className='h-6 w-32 mb-2' />
					<Skeleton className='h-10 w-40' />
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				{/* Tab menu skeleton */}
				<div className='border-b'>
					<div className='flex space-x-4 px-4'>
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className='h-10 w-24 my-2' />
						))}
					</div>
				</div>

				{/* Tab content skeleton */}
				<div className='p-4 space-y-4'>
					<Skeleton className='h-8 w-full max-w-md' />
					<div className='space-y-2'>
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className='h-24 w-full' />
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
