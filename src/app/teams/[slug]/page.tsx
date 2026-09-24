import { Suspense, type ComponentProps } from 'react';
import type { Metadata } from 'next';
import { TeamBanner } from '@/components/TeamBanner';
import Link from 'next/link';
import { ArrowLeft, DoorOpen, UserPlus } from 'lucide-react';
import { CounterStrikeIcon } from '@/components/Icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LeaveTeamDialog } from '@/components/LeaveTeamDialog';
import TeamActions from '@/components/TeamActions';
import { UsersSearch } from '@/components/UsersSearch';
import fetchTeam from '@/lib/helpers/fetch-team';
import { getAuthSession } from '@/lib/auth';
import fetchInvitedPlayers from '@/lib/helpers/fetch-invited-players';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { TeamMatchList } from '@/components/teams/TeamMatchList';
import { Skeleton } from '@/components/ui/skeleton';
// The team payload is the public projection (like the old JSON response); the banner/actions
// components are typed against the full row but only read these fields.
import type { ExtendedCs2Team } from '@/lib/models/team-model';

// Roster and results change with every invite, leave and match; always render per request.
export const dynamic = 'force-dynamic';

const TEAM_SIZE = 5;
const RECENT_MATCHES = 20;

interface CS2TeamPageProps {
	params: Promise<{
		slug: string;
	}>;
}

// fetchTeam is React-cached, so this and the page share a single team query per request.
export async function generateMetadata({ params }: CS2TeamPageProps): Promise<Metadata> {
	const { slug } = await params;
	const data = await fetchTeam(parseInt(slug, 10));
	return { title: data?.team?.name ?? 'Team not found' };
}

/** Shared across viewers: a team's recent (non-pickup) matches with team and tournament names. */
const loadTeamMatches = cachedQuery(
	(teamId: number) =>
		db.matches.findMany({
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
		}),
	['team-matches', String(RECENT_MATCHES)],
	{ tags: ['matches', 'teams', 'tournaments'], revalidate: REVALIDATE.standard },
);

async function fetchTeamMatches(teamId: number) {
	try {
		return await loadTeamMatches(teamId);
	} catch (error) {
		console.error('Error fetching team matches:', error);
		return null;
	}
}

/** Match history streams in under the roster header, which paints as soon as the team row is read. */
async function TeamMatches({ matches: matchesPromise, teamId }: { matches: ReturnType<typeof fetchTeamMatches>; teamId: number }) {
	const matches = await matchesPromise;
	return matches ? (
		<TeamMatchList matches={matches} teamId={teamId} />
	) : (
		<div role='alert' className='rounded-md border border-signal-live/20 bg-signal-live/10 px-4 py-10 text-center'>
			<p className='font-semibold'>Matches couldn&apos;t be loaded</p>
			<p className='mt-1 text-sm text-muted-foreground'>Reload the page to try again.</p>
		</div>
	);
}

function TeamMatchesSkeleton() {
	return (
		<div role='status' aria-busy='true' className='space-y-2'>
			<span className='sr-only'>Loading matches…</span>
			{Array.from({ length: 3 }).map((_, i) => (
				<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
			))}
		</div>
	);
}

export default async function CS2TeamPage({ params }: CS2TeamPageProps) {
	const { slug } = await params;
	const teamId = parseInt(slug, 10);

	// Started before the team/session lookups so the match history query runs alongside them.
	// fetchTeamMatches never rejects (it logs and resolves null), so an early 404 leaves nothing unhandled.
	const matches = isNaN(teamId) ? Promise.resolve(null) : fetchTeamMatches(teamId);

	const [session, data] = await Promise.all([getAuthSession(), fetchTeam(teamId)]);
	if (!data) notFound();
	const user = session?.user;

	const team = data.team;

	const isUserTeamCaptain = !!user && team.capitan?.id === user.id;
	const isUserMember = team.members.some((member: { id: string | undefined }) => member.id === user?.id);
	const memberCount: number = team.members.length;
	// Only the captain's invite dialog needs the pending invitations.
	const invitedPlayers = isUserTeamCaptain && memberCount < TEAM_SIZE ? await fetchInvitedPlayers(teamId) : null;

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-5/6 sm:px-0'>
			<div className='relative h-[240px] w-full overflow-hidden rounded-md border border-border bg-black sm:h-[420px]'>
				<TeamBanner userId={user?.id} team={team as unknown as ExtendedCs2Team} capitanId={team.capitan?.id ?? ''} enableTeamCapitanControls={isUserTeamCaptain} />
				<Link aria-label='Back to all teams' className={cn('absolute top-2 left-2 z-30', buttonVariants({ variant: 'outline', size: 'icon' }))} href='/teams'>
					<ArrowLeft aria-hidden className='h-4 w-4' />
				</Link>
			</div>

			<div className='mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-4'>
				<CounterStrikeIcon aria-hidden className='h-8 w-8 shrink-0' />
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
								<DoorOpen aria-hidden className='h-4 w-4' />
								<span className='hidden md:inline'>Leave Team</span>
							</Button>
						</LeaveTeamDialog>
					)}

					{isUserTeamCaptain && memberCount < TEAM_SIZE && (
						<Suspense fallback={null}>
							<UsersSearch teamName={team.name} teamId={team.id} invitedPlayers={invitedPlayers}>
								<Button aria-label='Invite players'>
									<UserPlus aria-hidden className='h-4 w-4' />
									<span className='hidden md:inline'>Invite Players</span>
								</Button>
							</UsersSearch>
						</Suspense>
					)}

					{/* Team owner actions */}
					<TeamActions team={team as unknown as ComponentProps<typeof TeamActions>['team']} userId={user?.id} isUserTeamCaptain={isUserTeamCaptain} />
				</div>
			</div>

			<section aria-labelledby='team-matches' className='mt-10'>
				<h2 id='team-matches' className='mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
					Matches
				</h2>
				<Suspense fallback={<TeamMatchesSkeleton />}>
					<TeamMatches matches={matches} teamId={team.id} />
				</Suspense>
			</section>
		</div>
	);
}
