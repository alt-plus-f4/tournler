import { Suspense } from 'react';
import { TeamBanner } from '@/components/TeamBanner';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa6';
import Link from 'next/link';
import { SiCounterstrike } from 'react-icons/si';
import { FaSignOutAlt } from 'react-icons/fa';
import { getAuthSession } from '@/lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LeaveTeamDialog } from '@/components/LeaveTeamDialog';
import { UsersSearch } from '@/components/UsersSearch';

interface CS2TeamPageProps {
	params: { id: string };
}

export default async function CS2TeamPage({ params }: CS2TeamPageProps) {
	const session = await getAuthSession();
	const user = session?.user;
	const teamId = parseInt(params.id, 10);

	//TODO GET TEAM

	if (!team) {
		return null;
	}

	// TODO: this is requested for each subcategory, refactor to get all users once
	async function getUsersOutsideOfThisTeam() {
		const users = await ApiClient.UsersApiService.usersControllerGetAllV1(
			{}
		);
		return users.filter((currentUser) => currentUser.cs2TeamId !== team.id);
	}

	async function getTeamInvitesSentUserIds() {
		const invites =
			await ApiClient.Cs2TeamsApiService.cs2TeamsControllerGetInvitationsSentV1(
				{
					teamId,
					authorization: await getBearerToken(),
				}
			);
		return invites.map((invite) => invite.userId);
	}

	async function getTeamJoinRequestsUserIds() {
		const requests =
			await ApiClient.Cs2TeamsApiService.cs2TeamsControllerGetJoinRequestsV1(
				{
					teamId,
					authorization: await getBearerToken(),
				}
			);
		return requests.map((request) => request.userId);
	}

	async function getUsersWithoutATeamAndNoRequestAndInvites() {
		const users = await getUsersOutsideOfThisTeam();
		const invitesUserIds = await getTeamInvitesSentUserIds();
		const requestsUserIds = await getTeamJoinRequestsUserIds();

		return users
			.filter((currentUser) => !currentUser.cs2TeamId)
			.filter((currentUser) => !invitesUserIds.includes(currentUser.id))
			.filter((currentUser) => !requestsUserIds.includes(currentUser.id));
	}

	async function getUsersWithATeamAndNoRequestAndInvites() {
		const users = await ApiClient.UsersApiService.usersControllerGetAllV1(
			{}
		);
		const invitesUserIds = await getTeamInvitesSentUserIds();
		const requestsUserIds = await getTeamJoinRequestsUserIds();

		return users
			.filter((currentUser) => currentUser.cs2TeamId)
			.filter((currentUser) => !invitesUserIds.includes(currentUser.id))
			.filter((currentUser) => !requestsUserIds.includes(currentUser.id));
	}

	async function getUsersRequestedToJoin() {
		const users = await getUsersOutsideOfThisTeam();
		const requestsUserIds = await getTeamJoinRequestsUserIds();

		return users.filter((currentUser) =>
			requestsUserIds.includes(currentUser.id)
		);
	}

	async function getUsersAlreadyInvited() {
		const users = await getUsersOutsideOfThisTeam();
		const invitesUserIds = await getTeamInvitesSentUserIds();

		return users.filter((currentUser) =>
			invitesUserIds.includes(currentUser.id)
		);
	}

	return (
		<Card className='w-full mt-12'>
			<CardHeader className='relative p-0 w-full aspect-[12/3] space-y-0 overflow-hidden rounded-t-xl'>
				<TeamBanner
					team={team}
					enableTeamCapitanControls={user?.id === team.capitanId}
				/>
				<Link className={cn('absolute top-1 left-1 rounded-xl', buttonVariants({variant: 'outline'}))} href={`/${locale}/cs2/teams`}>
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
						{user && user.cs2TeamId === team.id && (
							<LeaveTeamDialog team={team} user={user}>
								<Button variant='outline'>
									<FaSignOutAlt className='h-4 w-4' />
								</Button>
							</LeaveTeamDialog>
						)}

						{user && user.id === team.capitanId && (
							<Suspense fallback={null}>
								<UsersSearch
									teamId={team.id}
									usersWithoutATeam={await getUsersWithoutATeamAndNoRequestAndInvites()}
									usersWithATeam={await getUsersWithATeamAndNoRequestAndInvites()}
									usersRequestedToJoin={await getUsersRequestedToJoin()}
									usersAlreadyInvited={await getUsersAlreadyInvited()}
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
