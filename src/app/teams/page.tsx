import TeamDrawer from '@/components/TeamDrawer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuthSession } from '@/lib/auth';
import { CircleUser } from 'lucide-react';
import { Shell } from 'lucide-react';
import LoginButtons from '@/components/LoginButtons';

export default async function Page() {
	const session = await getAuthSession();

	return (
		<div className='w-[78%] mx-auto my-4'>
			<h1 className='text-2xl sm:text-4xl md:text-6xl font-black uppercase my-4 truncate text-clip text-center'>
				Counter-strike 2 Teams
			</h1>
			{!session?.user ? (
				<Alert className="md:flex">
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
				<Alert className="md:flex">
					<Shell className='h-4 w-4' />
					<div className="w-fit">
						<AlertTitle>If you want to be part of a team:</AlertTitle>
						<AlertDescription>
						Create a team or join an existing one.
						</AlertDescription>
					</div>

					<div className="md:ml-auto mt-2 md:mt-0">
						<TeamDrawer />
					</div>
				</Alert>
			)}

		</div>
	);
}
