import { Suspense } from 'react';
import { TeamBanner } from '@/components/TeamBanner';
import { FaArrowLeft, FaUserPlus, FaSignal } from 'react-icons/fa6';
import Link from 'next/link';
import { SiCounterstrike } from 'react-icons/si';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LeaveTeamDialog } from '@/components/LeaveTeamDialog';
import { UsersSearch } from '@/components/UsersSearch';
import useSessionUser from '@/hooks/use-session-user';
import useFetchUsers from '@/hooks/use-fetch-users';
import useFetchTeam from '@/hooks/use-fetch-team';

interface CS2TeamPageProps {
	params: {
		slug: string;
	};
}

export default function CS2TeamPage({ params }: CS2TeamPageProps) {
	const { user, loading: userLoading } = useSessionUser();
	const { slug } = params;
	const teamId = parseInt(slug, 10);
	const { team, loading: teamLoading } = useFetchTeam(teamId);
	const { users, loading: usersLoading } = useFetchUsers(teamId);

	if (userLoading || teamLoading || usersLoading) return <p>Loading...</p>;
	if (!team) return <p>Team not found</p>;

	return (
		<Card className='w-full mt-12'>
			<CardHeader className='relative p-0 w-full aspect-[12/3] space-y-0 overflow-hidden rounded-t-xl'>
				<TeamBanner
					team={team}
					enableTeamCapitanControls={team.isUserTeamCaptain}
				/>
				<Link
					className={cn(
						'absolute top-1 left-1 rounded-xl',
						buttonVariants({ variant: 'outline' })
					)}
					href='/cs2/teams'
				>
					<FaArrowLeft className='h-4 w-4' />
				</Link>
			</CardHeader>
			<CardContent className='p-3'>
				<div className='flex items-center'>
					<SiCounterstrike className='h-8 w-8 mr-1' />
					<h1 className='text-xl sm:text-2xl md:text-3xl font-black uppercase my-2 truncate text-clip'>
						{team.name}
					</h1>
					<div className='ml-auto flex flex-row gap-2'>
						{team.isUserMember && user && (
							<LeaveTeamDialog team={team} user={user}>
								<Button variant='outline'>
									<FaSignal className='h-4 w-4' />
								</Button>
							</LeaveTeamDialog>
						)}

						{team.isUserTeamCaptain && (
							<Suspense fallback={null}>
								<UsersSearch
									teamId={team.id}
									usersWithoutATeam={users.withoutTeam}
									usersWithATeam={users.withTeam}
									usersRequestedToJoin={users.requestedToJoin}
									usersAlreadyInvited={users.alreadyInvited}
								>
									<Button>
										<FaUserPlus className='h-4 w-4' />
									</Button>
								</UsersSearch>
							</Suspense>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
