import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { getAuthSession } from '@/lib/auth';
import { fetchTournament } from '@/lib/helpers/fetch-tournament';
import { fetchUserTeam } from '@/lib/helpers/fetch-user-team';
import { cn } from '@/lib/utils';

import Link from 'next/link';
import Image from 'next/image';

import { FaArrowLeft } from 'react-icons/fa';
import { IoIosCheckmarkCircleOutline } from 'react-icons/io';
import TabMenu from '@/components/tournament-tabs/TabMenu';
import { JoinLeaveButton } from '@/components/JoinLeaveButton';
import { buttonVariants } from '@/components/ui/button';
import Timer from '@/components/Timer';

interface TournamentPageProps {
	params: {
		slug: string;
	};
}

async function TournamentPage({ params }: TournamentPageProps) {
	const { slug } = params;
	const session = await getAuthSession();
	const user = session?.user;
	const tournamentId = parseInt(slug, 10);

	const tournament = await fetchTournament(tournamentId);
	if (!tournament) return <p>Tournament not found</p>;

	const userTeam = user ? await fetchUserTeam(user.id) : null;
	const hasTeam = !!userTeam;

	const timeLeftToJoin = Math.max(
		new Date(tournament.startDate).getTime() - new Date().getTime(),
		0
	);

	return (
		<Card className='w-5/6 mx-auto mt-8 border-none'>
			<CardHeader className='relative p-0 w-full h-[300px] space-y-0 rounded-t-xl'>
				<Image
					src={tournament.bannerUrl}
					alt={tournament.name}
					fill
					priority
					className='object-cover w-1200 h-220'
				/>
				<Link
					className={cn(
						'absolute top-2 left-2 z-10',
						buttonVariants({ variant: 'outline' })
					)}
					href='/tournaments'
				>
					<FaArrowLeft className='h-4 w-4' />
				</Link>

				<div className='absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-black to-transparent'></div>

				<div className='absolute inset-4 flex items-end justify-start'>
					<div className='flex flex-col'>
						<h1 className='text-white text-xl sm:text-4xl font-extrabold'>
							{tournament.name}
						</h1>
						<div className='flex flex-row items-center sm:mt-1'>
							<h1 className='text-foregroundgray text-xs sm:text-sm left-0'>
								Organized by{' '}
								<span className='text-white'>{tournament.organizer.name}</span>
							</h1>
							<IoIosCheckmarkCircleOutline className='ml-1' />
						</div>
					</div>
				</div>
				
				<div className='absolute inset-4 sm:inset-10 flex items-end justify-end flex-col text-center z-10 '>
					{hasTeam && timeLeftToJoin > 0 && tournament.status !== 'ONGOING' ? (
						<>
							<Timer timeLeft={timeLeftToJoin} />
							<JoinLeaveButton
								timeLeftToJoin={timeLeftToJoin}
								tournament={tournament}
								team={userTeam.team}
							/>
						</>
					) : (
						<span>Registration closed</span>
					)}
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				<TabMenu tournament={tournament} />
			</CardContent>
		</Card>
	);
}

export default TournamentPage;
