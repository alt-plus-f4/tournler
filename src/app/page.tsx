import { FeaturedNewsCard } from '@/components/FeaturedNewsCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { featuredTournaments } from '@/lib/sample/sampleNews';
import { upcomingTournaments } from '@/lib/sample/sampleUpcoming';
import Image from 'next/image';

export default function Page() {
	return (
		<div className='container mx-auto px-4 max-w-[1400px]'>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 p-8'>
				<div className='space-y-8'>
					<section>
						<Card className='border-none'>
							<CardHeader className='mb-2 flex flex-row gap-1 p-0 space-y-0 select-none'>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row-reverse border '>
									<Image
										className='h5 md:h-8 w-auto object-contain'
										src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/zFLwAELOD15BjJSDMMNBWQ-D3exi76MOTrjZtz0Xp7UEQBS1oWnUJ.png'
										alt='G2'
										width={32}
										height={32}
										draggable={false}
									/>
									<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-right'>
										<p className='font-style-1'>G2</p>
									</div>
								</div>
								<div className='flex flex-col justify-center rounded-small bg-canvas-95 px-3 py-4 text-center'>
									<p className='uppercase font-style-1'>
										Rewatch
									</p>
								</div>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row border '>
									<Image
										className='h-5 object-contain md:h-8'
										src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/4S22uk_gnZTiQiI-hhH4yp-RbEJga6u2dwOsFnlHUwTBmI01XKtj0.png'
										alt='HEROIC'
										width={32}
										height={32}
										draggable='false'
									/>
									<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-left'>
										<p className='font-style-1'>HEROIC</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								<div className='relative aspect-video w-full'>
									<iframe
										className='w-full h-full rounded-lg'
										src='https://www.youtube-nocookie.com/embed/z0rBsvbMapU?rel=0&modestbranding=1'
										title='YouTube video player'
										sandbox='allow-scripts allow-same-origin allow-presentation'
										loading='lazy'
										referrerPolicy='no-referrer'
										frameBorder='0'
									/>
								</div>
							</CardContent>
						</Card>
					</section>

					<section>
						<div className='flex items-center justify-between mb-8'>
							<h2 className='text-2xl font-bold tracking-tight'>
								Featured Tournaments
							</h2>
							<a
								href='/tournaments'
								className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'
							>
								All
							</a>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
							{featuredTournaments.map((tournament) => (
								<FeaturedNewsCard
									key={tournament.id}
									{...tournament}
								/>
							))}
						</div>
					</section>
				</div>

				<div className='lg:sticky lg:top-16 space-y-4 h-fit'>
					<div className='flex items-center justify-between mb-6'>
						<h2 className='text-2xl font-bold tracking-tight'>
							Upcoming
						</h2>
						<a
							href='/tournaments'
							className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'
						>
							All
						</a>
					</div>
					<div className='space-y-4 overflow-hidden'>
						{upcomingTournaments.map((tournament) => (
							<UpcomingTournament
								key={tournament.id}
								{...tournament}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
