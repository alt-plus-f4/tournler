import type { Metadata } from 'next';
import Link from 'next/link';
import TeamDrawer from '@/components/TeamDrawer';
import { getAuthSession } from '@/lib/auth';
import LoginButtons from '@/components/LoginButtons';
import { TeamCard } from '@/components/TeamCard';
import { ExtendedCs2Team } from '@/lib/models/team-model';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
	title: 'Teams',
};

export default async function Page() {
	const session = await getAuthSession();
	const userTeam: { id: number; name: string } | null = session?.user.email ? await getUserTeam(session.user.email) : null;

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
			<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Teams</h1>
			<p className='mt-2 text-sm text-muted-foreground'>Counter-Strike 2 rosters on Tournler: five players, one of them captain.</p>

			<div className='mt-6 flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between'>
				{!session?.user ? (
					<>
						<p className='text-sm'>Sign in to create a team or accept an invite to one.</p>
						<LoginButtons className='flex shrink-0 gap-x-2' />
					</>
				) : userTeam ? (
					<>
						<p className='text-sm'>
							You play for <span className='font-bold uppercase'>{userTeam.name}</span>.
						</p>
						<Link href={`/teams/${userTeam.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}>
							Go to your team
						</Link>
					</>
				) : (
					<p className='text-sm'>You&apos;re not on a team yet. Create one below, or ask a team captain to invite you.</p>
				)}
			</div>

			<h2 className='mt-10 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>All teams</h2>

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
				{!userTeam && session?.user && <TeamDrawer />}
				{await TeamsCards()}
			</div>
		</div>
	);
}

async function getUserTeam(userEmail: string) {
	try {
		const response = await fetch(`${process.env.NEXTAUTH_URL}/api/user/team?email=${encodeURIComponent(userEmail)}`);
		const data = await response.json();

		if (!response.ok) {
			console.error('Error response:', data.error);
			throw new Error(data.error || 'Failed to fetch user team');
		}

		return data.team ?? null;
	} catch (error) {
		console.error('Error fetching user team:', error);
		return null;
	}
}

async function TeamsCards() {
	try {
		const response = await fetch(`${process.env.NEXTAUTH_URL}/api/teams?limit=100`);
		const data = await response.json();

		if (!response.ok) {
			console.error('Error response:', data.error);
			throw new Error(data.error || 'Failed to fetch teams');
		}

		if (!data.teams?.length) {
			return (
				<div className='col-span-full rounded-md border border-border px-4 py-12 text-center'>
					<p className='font-semibold'>No teams yet</p>
					<p className='mt-1 text-sm text-muted-foreground'>The first team created will show up here.</p>
				</div>
			);
		}

		return (
			<>
				{data.teams.map((team: ExtendedCs2Team) => (
					<TeamCard key={team.id} team={team} />
				))}
			</>
		);
	} catch (error) {
		console.error('Error fetching teams:', error);
		return (
			<div role='alert' className='col-span-full rounded-md border border-signal-live/20 bg-signal-live/10 px-4 py-12 text-center'>
				<p className='font-semibold'>Teams couldn&apos;t be loaded</p>
				<p className='mt-1 text-sm text-muted-foreground'>Reload the page to try again.</p>
			</div>
		);
	}
}
