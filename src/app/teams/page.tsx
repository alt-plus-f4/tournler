import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import TeamDrawer from '@/components/TeamDrawer';
import { getAuthSession } from '@/lib/auth';
import LoginButtons from '@/components/LoginButtons';
import { fetchUserTeam } from '@/lib/helpers/fetch-user-team';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { TeamsCards, TeamsCardsSkeleton } from './_components/TeamsCards';

export const metadata: Metadata = {
	title: 'Teams',
};

// Team list and the viewer's own team change constantly; never serve a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function Page() {
	const session = await getAuthSession();
	const userTeam: { id: number; name: string } | null = session?.user.id ? ((await fetchUserTeam(session.user.id))?.team ?? null) : null;

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
				{/* The shell (heading + your-team banner) paints first; the card grid streams in. */}
				<Suspense fallback={<TeamsCardsSkeleton />}>
					<TeamsCards />
				</Suspense>
			</div>
		</div>
	);
}
