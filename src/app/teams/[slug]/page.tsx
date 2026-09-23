import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TeamBanner } from '@/components/TeamBanner';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa6';
import Link from 'next/link';
import { SiCounterstrike } from 'react-icons/si';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LeaveTeamDialog } from '@/components/LeaveTeamDialog';
import TeamActions from '@/components/TeamActions';
import { UsersSearch } from '@/components/UsersSearch';
import fetchTeam from '@/lib/helpers/fetch-team';
import { getAuthSession } from '@/lib/auth';
import { LiaDoorOpenSolid } from 'react-icons/lia';
import fetchInvitedPlayers from '@/lib/helpers/fetch-invited-players';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { TeamMatchList } from '@/components/teams/TeamMatchList';

const TEAM_SIZE = 5;
const RECENT_MATCHES = 20;

interface CS2TeamPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params }: CS2TeamPageProps): Promise<Metadata> {
	const { slug } = await params;
	const data = await fetchTeam(parseInt(slug, 10));
	return { title: data?.team?.name ?? 'Team not found' };
}

async function fetchTeamMatches(teamId: number) {
	try {
		return await db.matches.findMany({
			where: { isPickup: false, OR: [{ teamAId: teamId }, { teamBId: teamId }] },
			orderBy: { matchDate: 'desc' },
			take: RECENT_MATCHES,
			select: {
				id: true,
				status: true,
				matchDate: true,
				scoreTeamA: true,
				scoreTeamB: true,
				winnerId: true,
				teamAId: true,
				teamBId: true,
				teamA: { select: { id: true, name: true } },
				teamB: { select: { id: true, name: true } },
				tournament: { select: { id: true, name: true } },
			},
		});
	} catch (error) {
		console.error('Error fetching team matches:', error);
		return null;
	}
}

export default async function CS2TeamPage({ params }: CS2TeamPageProps) {
	const { slug } = await params;

	const session = await getAuthSession();
	const user = session?.user;

	const teamId = parseInt(slug, 10);

	let team = await fetchTeam(teamId);
	if (!team) notFound();

	team = team.team;

	const isUserTeamCaptain = team?.capitan.id === user?.id;
	const isUserMember = team?.members.some((member: { id: string | undefined }) => member.id === user?.id);
	const [invitedPlayers, matches] = await Promise.all([fetchInvitedPlayers(teamId), fetchTeamMatches(teamId)]);
	const memberCount: number = team.members.length;

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-5/6 sm:px-0'>
			<div className='relative h-[240px] w-full overflow-hidden rounded-md border border-border bg-black sm:h-[420px]'>
				<TeamBanner userId={user?.id} team={team} capitanId={team.capitan.id} enableTeamCapitanControls={isUserTeamCaptain} />
				<Link aria-label='Back to all teams' className={cn('absolute top-2 left-2 z-30', buttonVariants({ variant: 'outline', size: 'icon' }))} href='/teams'>
					<FaArrowLeft aria-hidden className='h-4 w-4' />
				</Link>
			</div>

			<div className='mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-4'>
				<SiCounterstrike aria-hidden className='h-8 w-8 shrink-0' />
				<div className='min-w-0'>
					<h1 className='truncate text-2xl font-black uppercase tracking-wide md:text-4xl'>{team.name}</h1>
					<p className='text-sm text-muted-foreground'>
						<span className='font-mono tabular-nums text-white'>
							{memberCount}/{TEAM_SIZE}
						</span>{' '}
						players{team.capitan?.name ? <> · Captain {team.capitan.name}</> : null}
					</p>
				</div>
				<div className='ml-auto flex flex-row gap-2'>
					{isUserMember && user && (
						<LeaveTeamDialog teamId={team.id} userId={user.id}>
							<Button variant='outline' aria-label='Leave team'>
								<LiaDoorOpenSolid aria-hidden className='h-4 w-4' />
								<span className='hidden md:inline'>Leave Team</span>
							</Button>
						</LeaveTeamDialog>
					)}

					{isUserTeamCaptain && memberCount < TEAM_SIZE && (
						<Suspense fallback={null}>
							<UsersSearch teamName={team.name} teamId={team.id} invitedPlayers={invitedPlayers}>
								<Button aria-label='Invite players'>
									<FaUserPlus aria-hidden className='h-4 w-4' />
									<span className='hidden md:inline'>Invite Players</span>
								</Button>
							</UsersSearch>
						</Suspense>
					)}

					{/* Team owner actions */}
					<TeamActions team={team} userId={user?.id} isUserTeamCaptain={isUserTeamCaptain} />
				</div>
			</div>

			<section aria-labelledby='team-matches' className='mt-10'>
				<h2 id='team-matches' className='mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
					Matches
				</h2>
				{matches ? (
					<TeamMatchList matches={matches} teamId={team.id} />
				) : (
					<div role='alert' className='rounded-md border border-signal-live/20 bg-signal-live/10 px-4 py-10 text-center'>
						<p className='font-semibold'>Matches couldn&apos;t be loaded</p>
						<p className='mt-1 text-sm text-muted-foreground'>Reload the page to try again.</p>
					</div>
				)}
			</section>
		</div>
	);
}
