import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className='w-[78%] mx-auto my-8'>
			<div className='relative flex flex-col items-center rounded-lg shadow-lg overflow-hidden'>
				<Skeleton className='w-full h-[321px] ' />
				<div className='absolute inset-4 flex items-end justify-center'>
					<Skeleton className='h-[65px] w-[80%] ' />
				</div>
			</div>

			{/* Upcoming Tournaments Skeletons */}
			<div className='mt-8 flex flex-col sm:flex-row gap-4 sm:justify-around items-center'>
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className='flex flex-col w-[30%] items-center border rounded shadow-lg h-[156px] mt-4 sm:mt-2'
					>
						<Skeleton className='w-full h-12 ' />
						<Skeleton className='h-4 w-40 mt-4 ' />
						<Skeleton className='h-2 w-32 mt-2 ' />
						<span className='border w-full mt-2'></span>
						<Skeleton className='h-4 w-[80%] my-2 ' />
					</div>
				))}
			</div>

			{/* Button Skeletons */}
			<div className='flex flex-col sm:flex-row justify-center gap-4 mt-8'>
				<Skeleton className='h-10 w-40 ' />
				<Skeleton className='h-10 w-40 ' />
			</div>

			{/* Tournament Row Skeletons */}
			<div className='mt-12 space-y-2'>
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className='flex items-center gap-4 p-4 border rounded justify-between'
					>
						<Skeleton className='w-8 h-8 rounded-full ' />
						<Skeleton className='h-4 w-48 ' />
						<Skeleton className='h-4 w-24 ' />
						<Skeleton className='h-4 w-32 ' />
					</div>
				))}
			</div>
		</div>
	);
}
