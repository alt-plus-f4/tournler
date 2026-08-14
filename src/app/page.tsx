import { FeaturedNewsCard } from '@/components/FeaturedNewsCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import { InteractiveBackground } from '@/components/InteractiveBackground';
import { db } from '@/lib/db';
import { TournamentStatus } from '@prisma/client';
import Image from 'next/image';

const FALLBACK_BANNER = '/info-image.png';

async function getHomeTournaments() {
	const [featured, upcoming] = await Promise.all([
		db.cs2Tournament.findMany({
			where: { status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } },
			orderBy: { prizePool: 'desc' },
			take: 6,
			include: { teams: true },
		}),
		db.cs2Tournament.findMany({
			where: { status: TournamentStatus.UPCOMING },
			orderBy: { startDate: 'asc' },
			take: 3,
			include: { teams: true },
		}),
	]);

	return { featured, upcoming };
}

export default async function Page() {
	const { featured, upcoming } = await getHomeTournaments();

	return (
		<div className='relative'>
			<InteractiveBackground />
			<div className='container mx-auto px-4 max-w-[1400px]'>
				<div className='grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 p-8'>
					<div className='space-y-8'>
						<section>
							<Card className='border-none'>
								<CardHeader className='mb-2 flex flex-row gap-1 p-0 space-y-0 select-none'>
									<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row-reverse border '>
										<Image className='h5 md:h-8 w-auto object-contain' src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/zFLwAELOD15BjJSDMMNBWQ-D3exi76MOTrjZtz0Xp7UEQBS1oWnUJ.png' alt='G2' width={32} height={32} draggable={false} />
										<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-right'>
											<p className='font-style-1'>G2</p>
										</div>
									</div>
									<div className='flex flex-col justify-center rounded-small bg-canvas-95 px-3 py-4 text-center'>
										<p className='uppercase font-style-1'>Rewatch</p>
									</div>
									<div className='flex w-full flex-col gap-2 rounded-lg p-1 py-2 lg:py-1 items-center lg:gap-5 lg:px-5 lg:flex-row border '>
										<Image className='h-5 object-contain md:h-8' src='https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/4S22uk_gnZTiQiI-hhH4yp-RbEJga6u2dwOsFnlHUwTBmI01XKtj0.png' alt='HEROIC' width={32} height={32} draggable={false} />
										<div className='w-full text-center text-neutral-0 lg:flex lg:w-fit lg:flex-col lg:text-left'>
											<p className='font-style-1'>HEROIC</p>
										</div>
									</div>
								</CardHeader>
								<CardContent className='p-0'>
									<div className='relative aspect-video w-full'>
										<iframe
											className='w-full h-full rounded-lg'
											src='https://www.youtube-nocookie.com/embed/z0rBsvbMapU?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1'
											title='Live stream'
											allow='autoplay; encrypted-media; picture-in-picture'
											sandbox='allow-scripts allow-same-origin allow-presentation'
											referrerPolicy='no-referrer'
											frameBorder='0'
										/>
									</div>
								</CardContent>
							</Card>
						</section>

						<section>
							<div className='flex items-center justify-between mb-8'>
								<h2 className='text-2xl font-bold tracking-tight'>Featured Tournaments</h2>
								<a href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
									All
								</a>
							</div>
							{featured.length > 0 ? (
								<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
									{featured.map((tournament) => (
										<FeaturedNewsCard key={tournament.id} id={tournament.id} name={tournament.name} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool ?? 0} location={tournament.location} />
									))}
								</div>
							) : (
								<p className='text-muted-foreground'>No tournaments yet — check back soon.</p>
							)}
						</section>
					</div>

					<div className='lg:sticky lg:top-16 space-y-4 h-fit'>
						<div className='flex items-center justify-between mb-6'>
							<h2 className='text-2xl font-bold tracking-tight'>Upcoming</h2>
							<a href='/tournaments' className='text-base uppercase font-medium text-muted-foreground hover:text-white transition-colors'>
								All
							</a>
						</div>
						<div className='space-y-4 overflow-hidden'>
							{upcoming.length > 0 ? (
								upcoming.map((tournament) => <UpcomingTournament key={tournament.id} id={tournament.id} name={tournament.name} startDate={tournament.startDate.toISOString()} bannerUrl={tournament.bannerUrl || FALLBACK_BANNER} prizePool={tournament.prizePool ?? 0} teams={tournament.teams} location={tournament.location} teamCapacity={tournament.teamCapacity} isHomePage />)
							) : (
								<p className='text-sm text-muted-foreground'>Nothing scheduled yet.</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
