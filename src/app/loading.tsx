import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
	return (
		<div className='container mx-auto px-4 max-w-[1400px]'>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 p-8'>
				<div className='space-y-8'>
					{/* Featured video/match skeleton */}
					<section>
						<Card className='border-none'>
							<CardHeader className='mb-2 flex flex-row gap-1 p-0 space-y-0'>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row-reverse border'>
									<Skeleton className='h-8 w-8 rounded-full' />
									<div className='w-full text-center lg:flex lg:w-fit lg:flex-col lg:text-right'>
										<Skeleton className='h-5 w-20 mx-auto lg:ml-auto' />
									</div>
								</div>
								<div className='flex flex-col justify-center rounded-small px-3 py-4 text-center'>
									<Skeleton className='h-5 w-16' />
								</div>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row border'>
									<Skeleton className='h-8 w-8 rounded-full' />
									<div className='w-full text-center lg:flex lg:w-fit lg:flex-col lg:text-left'>
										<Skeleton className='h-5 w-20 mx-auto lg:mr-auto' />
									</div>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								<div className='relative aspect-video w-full'>
									<Skeleton className='w-full h-full rounded-lg' />
								</div>
							</CardContent>
						</Card>
					</section>

					{/* Featured tournaments section */}
					<section>
						<div className='flex items-center justify-between mb-8'>
							<Skeleton className='h-8 w-48' />
							<Skeleton className='h-5 w-12' />
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<div
									key={i}
									className='overflow-hidden rounded-lg border bg-card shadow-sm'
								>
									<div className='relative h-32 w-full'>
										<Skeleton className='h-full w-full' />
									</div>
									<div className='p-4 space-y-2'>
										<Skeleton className='h-6 w-3/4' />
										<div className='flex justify-between items-center'>
											<Skeleton className='h-4 w-20' />
											<Skeleton className='h-4 w-16' />
										</div>
										<div className='flex items-center justify-between'>
											<Skeleton className='h-4 w-24' />
											<Skeleton className='h-4 w-20' />
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>

				{/* Sidebar with upcoming tournaments */}
				<div className='lg:sticky lg:top-16 space-y-4 h-fit'>
					<div className='flex items-center justify-between mb-6'>
						<Skeleton className='h-8 w-32' />
						<Skeleton className='h-5 w-12' />
					</div>
					<div className='space-y-4 overflow-hidden'>
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className='relative flex flex-col items-center justify-center rounded-md shadow-lg overflow-hidden h-[156px] w-full'
							>
								<div className='relative w-full h-20'>
									<Skeleton className='w-full h-full' />
								</div>
								<div className='w-full bg-black border-t-0 border text-center'>
									<Skeleton className='h-5 w-3/4 mx-auto mt-2' />
									<Skeleton className='h-4 w-1/2 mx-auto my-2' />
									<div className='grid grid-cols-3 gap-1 items-center text-center border-t-2 py-1'>
										<div className='flex flex-col items-center'>
											<Skeleton className='h-4 w-16' />
											<Skeleton className='h-3 w-8 mt-1' />
										</div>
										<div className='flex flex-col items-center'>
											<Skeleton className='h-4 w-16' />
											<Skeleton className='h-3 w-12 mt-1' />
										</div>
										<div className='flex flex-col items-center'>
											<Skeleton className='h-4 w-10' />
											<Skeleton className='h-3 w-8 mt-1' />
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
