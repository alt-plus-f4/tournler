import TeamDrawer from '@/components/TeamDrawer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuthSession } from '@/lib/auth';
import { CircleUser } from 'lucide-react';
import { Shell } from 'lucide-react';
import LoginButtons from '@/components/LoginButtons';
import { TeamCard } from '@/components/TeamCard';
import { ExtendedCs2Team } from '@/lib/models/team-model';

export default async function Page() {
	const session = await getAuthSession();
	const userTeam = session?.user.email
		? await getUserTeam(session.user.email)
		: null;

	return (
		<div className='w-[78%] mx-auto my-4'>
			<h1 className='text-2xl md:text-4xl lg:text-6xl font-black uppercase my-4 truncate text-clip text-center'>
				Counter-strike 2 Teams
			</h1>
			{!session?.user ? (
				<Alert className='md:flex'>
					<CircleUser className='h-4 w-4' />

					<div className='w-fit'>
						<AlertTitle>Heads up!</AlertTitle>
						<AlertDescription>
							You need an account to create or join a team.
						</AlertDescription>
					</div>

					<LoginButtons className='flex gap-x-2 md:ml-auto mt-2 md:mt-0 ' />
				</Alert>
			) : (
				<Alert className='md:flex'>
					<Shell className='h-4 w-4' />
					<div className='w-fit'>
						<AlertTitle>
							If you want to be part of a team:
						</AlertTitle>
						<AlertDescription>
							Create a team or join an existing one.
						</AlertDescription>
					</div>
				</Alert>
			)}

			<div className='flex items-center'>
				<h2 className='text-lg sm:text-2xl md:text-4xl font-semibold my-4 truncate text-clip'>
					Teams
				</h2>
			</div>

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-evenly border-l-2 ml-4 pl-4 border-black dark:border-white'>
				{!userTeam && session?.user && <TeamDrawer />}
				{await TeamsCards()}
			</div>
		</div>
	);
}
async function getUserTeam(userEmail: string) {
	try {
		const response = await fetch(
			`${process.env.NEXTAUTH_URL}/api/user/team?email=${userEmail}`
		);
		const data = await response.json();

		if (!response.ok) {
			console.error('Error response:', data.error);
			throw new Error(data.error || 'Failed to fetch user team');
		}

		return data.team;
	} catch (error) {
		console.error('Error fetching user team:', error);
		return null;
	}
}

async function TeamsCards() {
	try {
		const response = await fetch(`${process.env.NEXTAUTH_URL}/api/teams`);
		const data = await response.json();

		if (!response.ok) {
			console.error('Error response:', data.error);
			throw new Error(data.error || 'Failed to fetch teams');
		}

		return (
			<>
				{data.teams.map((team: ExtendedCs2Team) => (
					<TeamCard key={team.id} team={team} /> // id is unique i hope
				))}
			</>
		);
	} catch (error) {
		console.error('Error fetching teams:', error);
		return (
			<div className='h-[200px] border flex items-center justify-center text-center'>
				Error while loading teams
				<br />
				Try again
			</div>
		);
	}
}
