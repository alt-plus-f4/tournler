import { Suspense } from 'react';
import { TeamBanner } from '@/components/TeamBanner';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa6';
import Link from 'next/link';
import { SiCounterstrike } from 'react-icons/si';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LeaveTeamDialog } from '@/components/LeaveTeamDialog';
import { UsersSearch } from '@/components/UsersSearch';
import fetchTeam from '@/lib/helpers/fetch-team';
import { getAuthSession } from '@/lib/auth';
import { fetchUsersNotInTheTeam } from '@/lib/helpers/fetch-users-not-in-team';
import { LiaDoorOpenSolid } from 'react-icons/lia';
import fetchInvitedPlayers from '@/lib/helpers/fetch-invited-players';

interface CS2TeamPageProps {
	params: {
		slug: string;
	};
}

export default async function CS2TeamPage({ params }: CS2TeamPageProps) {
	const { slug } = params;

	const session = await getAuthSession();
	const user = session?.user;

	const teamId = parseInt(slug, 10);

	let team = await fetchTeam(teamId);
	if (!team) return <p>Team not found</p>;

	team = team.team;

	const isUserTeamCaptain = team?.capitan.id === user?.id;
	const isUserMember = team?.members.some(
		(member: { id: string | undefined }) => member.id === user?.id
	);
	const allUsers = await fetchUsersNotInTheTeam(teamId);
	const invitedPlayers = await fetchInvitedPlayers(teamId);

	return (
		<Card className='w-5/6 mx-auto align-center mt-12 h-[750px]'>
			<CardHeader className='relative p-0 w-full h-[60%] space-y-0 overflow-hidden rounded-t-xl'>
				<TeamBanner
					team={team}
					capitanId={team.capitan.id}
					enableTeamCapitanControls={isUserTeamCaptain}
				/>
				<Link
					className={cn(
						'absolute top-1 left-1',
						buttonVariants({ variant: 'outline' })
					)}
					href='/teams'
				>
					<FaArrowLeft className='h-4 w-4' />
				</Link>
			</CardHeader>
			<CardContent className='p-3'>
				<div className='flex items-center border-b-2 border-gray-500 pb-2 mb-2'>
					<SiCounterstrike className='h-8 w-8 mr-1' />
					<h1 className='text-xl sm:text-2xl md:text-3xl font-black uppercase my-2 truncate text-clip'>
						{team.name}
					</h1>
					<div className='ml-auto flex flex-row gap-2'>
						{isUserMember && user && (
							<LeaveTeamDialog teamId={team.id} userId={user.id}>
								<Button variant='outline'>
									<LiaDoorOpenSolid className='h-4 w-4' />
									<p className='hidden md:block'>
										Leave Team
									</p>
								</Button>
							</LeaveTeamDialog>
						)}

						{isUserTeamCaptain && (
							<Suspense fallback={null}>
								<UsersSearch
									teamName={team.name}
									teamId={team.id}
									allUsers={allUsers}
									invitedPlayers={invitedPlayers}
								>
									<Button>
										<FaUserPlus className='h-4 w-4' />
										<p className='hidden md:block'>
											Invite Players
										</p>
									</Button>
								</UsersSearch>
							</Suspense>
						)}
					</div>
				</div>
				<div className='flex mx-1 mt-2'>
					{/* Matches */}
					<h1 className='text-xl'>Matches</h1>
				</div>
			</CardContent>
		</Card>
	);
}
