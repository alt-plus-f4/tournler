import { FeaturedNewsCard } from '@/components/FeaturedNewsCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import Image from 'next/image';

export default function Page() {
	const featuredTournaments = [
		{
			id: 1,
			name: 'Championship Finals',
			startDate: '2025-02-10',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 50000,
			location: 'New York, USA',
			teamCapacity: 16,
		},
		{
			id: 2,
			name: 'Summer Invitational',
			startDate: '2025-06-15',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 10000,
			location: 'Los Angeles, USA',
			teamCapacity: 12,
		},
		{
			id: 3,
			name: 'Winter Clash',
			startDate: '2025-12-01',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 10000,
			location: 'Chicago, USA',
			teamCapacity: 10,
		},
		{
			id: 4,
			name: 'Championship Finals',
			startDate: '2025-02-10',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 50000,
			location: 'New York, USA',
			teamCapacity: 16,
		},
		{
			id: 5,
			name: 'Summer Invitational',
			startDate: '2025-06-15',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 10000,
			location: 'Los Angeles, USA',
			teamCapacity: 12,
		},
		{
			id: 6,
			name: 'Winter Clash',
			startDate: '2025-12-01',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			prizePool: 10000,
			location: 'Chicago, USA',
			teamCapacity: 10,
		},
	];

	const upcomingTournaments = [
		{
			id: 4,
			name: 'Regional Qualifiers',
			startDate: '2025-01-25',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			teams: ['asd', 'asd'],
			prizePool: 8000,
			location: 'Los Angeles, USA',
			teamCapacity: 8,
			isHomePage: true,
		},
		{
			id: 5,
			name: 'Regional Qualifiers',
			startDate: '2025-01-25',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			teams: ['asd', 'asd'],
			prizePool: 8000,
			location: 'Los Angeles, USA',
			teamCapacity: 8,
			isHomePage: true,
		},
		{
			id: 6,
			name: 'Regional Qualifiers',
			startDate: '2025-01-25',
			bannerUrl:
				'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png',
			teams: ['asd', 'asd'],
			prizePool: 8000,
			location: 'Los Angeles, USA',
			teamCapacity: 8,
			isHomePage: true,
		},
	];

	return (
		<div className='container mx-auto px-4 max-w-[1400px]'>
			<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 p-8'>
				<div className='space-y-8'>
					<section>
						<Card className='border-none'>
							<CardHeader className='mb-2 flex flex-row gap-1 p-0 space-y-0 select-none'>
								<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row-reverse border '>
									<Image
										className='h-5 object-contain md:h-8'
										src='https://img-cdn.hltv.org/teamlogo/zFLwAELOD15BjJSDMMNBWQ.png?ixlib=java-2.1.0&w=50&s=affb583e6716d8ee904826992255cc4b'
										alt='G2'
										width={50}
										height={50}
										draggable='false'
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
										src='https://img-cdn.hltv.org/teamlogo/4S22uk_gnZTiQiI-hhH4yp.png?ixlib=java-2.1.0&w=50&s=3619ddf1d490573ab3dc261b8c2f3f6f'
										alt='HEROIC'
										width={50}
										height={50}
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
										className='w-full h-full'
										src='https://www.youtube.com/embed/z0rBsvbMapU?si=QdrFFSCXoQYbP1ih&autoplay=1&mute=1&controls=1&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&loop=1&playlist=z0rBsvbMapU'
										title='YouTube video player'
										allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
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
					<div className='space-y-4'>
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
