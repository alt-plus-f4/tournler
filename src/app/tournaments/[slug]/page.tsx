import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { TournamentFormat } from '@prisma/client';

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeam } from '@/lib/helpers/fetch-user-team';
import { userHasPermission } from '@/lib/helpers/permissions';
import { flairMapper, playerFlairSelect } from '@/lib/helpers/player-flair';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import TabMenu from '@/components/tournament-tabs/TabMenu';
import type { Champion, TournamentDetail } from '@/components/tournament-tabs/types';
import { JoinLeaveButton } from '@/components/JoinLeaveButton';
import { StartTournamentButton } from '@/components/StartTournamentButton';
import Timer from '@/components/Timer';

// Registration, brackets and results change constantly (and JoinLeaveButton revalidates this path);
// always render per request.
export const dynamic = 'force-dynamic';

interface TournamentPageProps {
	params: Promise<{
		slug: string;
	}>;
}

/** One query per request, shared by generateMetadata and the page. */
const getTournament = cache(async (slug: string) => {
	const id = Number.parseInt(slug, 10);
	if (Number.isNaN(id)) return null;

	return db.cs2Tournament.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			description: true,
			prizePool: true,
			teamCapacity: true,
			location: true,
			startDate: true,
			endDate: true,
			bannerUrl: true,
			logoUrl: true,
			status: true,
			type: true,
			format: true,
			bestOf: true,
			mapPool: true,
			organizer: { select: { name: true } },
			teams: {
				select: {
					id: true,
					name: true,
					logo: true,
					background: true,
					capitanId: true,
					members: { select: { id: true, name: true, image: true, ...playerFlairSelect } },
				},
			},
		},
	});
});

/**
 * The champion is only named when the bracket itself decided one: the completed last-round match
 * of the winners bracket (single elimination) or of the grand final (double elimination, where a
 * bracket reset adds a round 2). Round robin has no final match, so nothing is claimed.
 */
async function getChampion(tournamentId: number, format: TournamentFormat): Promise<Champion | null> {
	if (format === 'ROUND_ROBIN') return null;
	const slot = format === 'DOUBLE_ELIMINATION' ? 'GRAND_FINAL' : 'WINNERS';
	const finals = await db.matches.findMany({
		where: { tournamentId, bracketSlot: slot },
		orderBy: { round: 'desc' },
		take: 2,
		select: { round: true, status: true, winner: { select: { id: true, name: true } } },
	});
	const [last, previous] = finals;
	if (!last || (previous && previous.round === last.round)) return null;
	return last.status === 'COMPLETED' && last.winner ? last.winner : null;
}

type Registration = { label: string; detail: string; open: boolean; full: boolean };

/** What the register button can actually do right now, stated plainly. */
function getRegistration(t: { status: string; startDate: Date; teamCapacity: number; teams: unknown[] }): Registration {
	const count = t.teams.length;
	const full = count >= t.teamCapacity;
	const teams = `${count}/${t.teamCapacity} teams`;

	if (t.status === 'COMPLETED') return { label: 'Finished', detail: teams, open: false, full };
	if (t.status === 'ONGOING') return { label: 'In progress', detail: `Registration closed · ${teams}`, open: false, full };
	// Scheduled start has passed but nobody has started it yet (the start is manual or cron-driven).
	if (t.startDate.getTime() <= Date.now()) return { label: 'Start pending', detail: `Waiting for the organizer to start · ${teams}`, open: false, full };
	if (full) return { label: 'Full', detail: `All ${t.teamCapacity} slots are taken`, open: true, full };
	return { label: 'Registration open', detail: `${teams} registered`, open: true, full };
}

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
	const { slug } = await params;
	const tournament = await getTournament(slug);
	return { title: tournament?.name ?? 'Tournament not found' };
}

type LoadedTournament = NonNullable<Awaited<ReturnType<typeof getTournament>>>;

/**
 * Everything the tabs need that the hero doesn't: per-player flair (FACEIT levels are an external
 * API call) and the champion lookup. Started before the hero's auth queries and awaited inside a
 * Suspense boundary, so the hero paints without waiting on FACEIT.
 */
async function loadTabs(tournament: LoadedTournament): Promise<{ detail: TournamentDetail; champion: Champion | null }> {
	const [champion, withFlair] = await Promise.all([
		tournament.status === 'COMPLETED' ? getChampion(tournament.id, tournament.format) : Promise.resolve(null),
		// Verified badge + real FACEIT level per rostered player; Steam IDs/badge rows are stripped here.
		flairMapper(tournament.teams.flatMap((t) => t.members)),
	]);
	const detail: TournamentDetail = {
		...tournament,
		startDate: tournament.startDate.toISOString(),
		endDate: tournament.endDate.toISOString(),
		teams: tournament.teams.map((t) => ({ ...t, members: t.members.map(withFlair) })),
	};
	return { detail, champion };
}

async function TournamentTabs({ data }: { data: ReturnType<typeof loadTabs> }) {
	const { detail, champion } = await data;
	return <TabMenu tournament={detail} champion={champion} />;
}

/** Matches TabMenu's tab bar + first panel footprint so the page doesn't jump when it streams in. */
function TabsSkeleton() {
	return (
		<div role='status' aria-busy='true'>
			<span className='sr-only'>Loading tournament details…</span>
			<div className='border-b border-border py-2 md:mx-4'>
				<div className='flex justify-between gap-2 md:justify-start md:gap-16 lg:gap-24'>
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className='h-9 w-16 rounded-md bg-neutral-900 sm:w-20' />
					))}
				</div>
			</div>
			<div className='mt-6 space-y-3 md:mx-4'>
				<div className='h-5 w-40 rounded-md bg-neutral-900' />
				<div className='h-64 rounded-md border border-border bg-neutral-950' />
			</div>
		</div>
	);
}

export default async function TournamentPage({ params }: TournamentPageProps) {
	const { slug } = await params;
	const tournament = await getTournament(slug);
	if (!tournament) notFound();

	const tabs = loadTabs(tournament);

	const session = await getAuthSession();
	const user = session?.user;
	const [canManageTournaments, userTeamResponse] = await Promise.all([
		user ? userHasPermission(user.id, 'tournaments:manage') : Promise.resolve(false),
		user ? fetchUserTeam(user.id) : Promise.resolve(null),
	]);
	const userTeam: { id: number; name: string } | null = userTeamResponse?.team ?? null;

	const registration = getRegistration(tournament);
	const timeLeftToJoin = Math.max(tournament.startDate.getTime() - Date.now(), 0);
	const joinTarget = { id: tournament.id, name: tournament.name, startDate: tournament.startDate.toISOString() };

	return (
		<Card className='mx-auto mt-8 mb-12 w-[calc(100%-2rem)] overflow-hidden border-none bg-transparent sm:w-5/6'>
			<CardHeader className='relative min-h-[300px] w-full justify-end space-y-0 overflow-hidden rounded-t-xl bg-neutral-900 p-0'>
				{tournament.bannerUrl && <Image src={tournament.bannerUrl} alt='' fill preload sizes='(max-width: 640px) 100vw, 84vw' className='object-cover' />}
				<div aria-hidden className='absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent' />

				<Link href='/tournaments' aria-label='Back to tournaments' className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'absolute left-2 top-2 z-10 bg-black/60')}>
					<ArrowLeft className='h-4 w-4' aria-hidden />
				</Link>

				{/* In flow (not absolutely stacked) so a long name and the register block never overlap. */}
				<div className='relative z-10 flex flex-col gap-4 p-4 pt-16 sm:flex-row sm:items-end sm:justify-between sm:p-10 sm:pt-20'>
					<div className='min-w-0'>
						<h1 className='text-balance text-xl font-extrabold text-white sm:text-4xl'>{tournament.name}</h1>
						{tournament.organizer.name && (
							<p className='text-xs text-muted-foreground sm:mt-1 sm:text-sm'>
								Organized by <span className='text-white'>{tournament.organizer.name}</span>
							</p>
						)}
					</div>

					<div className='flex shrink-0 flex-col items-start gap-2 sm:items-end sm:text-right'>
						{canManageTournaments && tournament.status === 'UPCOMING' && (
							<div className='mb-1'>
								<StartTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} teamCount={tournament.teams.length} teamCapacity={tournament.teamCapacity} format={tournament.format} bestOf={tournament.bestOf} />
							</div>
						)}
						<div>
							<p className='text-sm font-bold text-white'>{registration.label}</p>
							<p className='font-mono text-xs tabular-nums text-muted-foreground'>{registration.detail}</p>
						</div>
						{registration.open && timeLeftToJoin > 0 && (
							<div className='text-muted-foreground'>
								<Timer timeLeft={timeLeftToJoin} />
							</div>
						)}

						{registration.open && userTeam && <JoinLeaveButton timeLeftToJoin={timeLeftToJoin} tournament={joinTarget} team={userTeam} isFull={registration.full} />}
						{registration.open && !registration.full && !user && (
							<p className='text-sm text-muted-foreground'>
								<Link href='/sign-in' className='font-medium text-white underline underline-offset-4'>
									Sign in
								</Link>{' '}
								to register your team.
							</p>
						)}
						{registration.open && !registration.full && user && !userTeam && (
							<p className='text-sm text-muted-foreground'>
								You need a team to register.{' '}
								<Link href='/teams' className='font-medium text-white underline underline-offset-4'>
									Create or join a team
								</Link>
							</p>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				<Suspense fallback={<TabsSkeleton />}>
					<TournamentTabs data={tabs} />
				</Suspense>
			</CardContent>
		</Card>
	);
}
