import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { TournamentFormat } from '@prisma/client';

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeam } from '@/lib/helpers/fetch-user-team';
import { userHasPermission } from '@/lib/helpers/permissions';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import TabMenu from '@/components/tournament-tabs/TabMenu';
import type { Champion, TournamentDetail } from '@/components/tournament-tabs/types';
import { JoinLeaveButton } from '@/components/JoinLeaveButton';
import { StartTournamentButton } from '@/components/StartTournamentButton';
import Timer from '@/components/Timer';

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
					members: { select: { id: true, name: true, role: true, image: true } },
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
	if (t.startDate.getTime() <= Date.now()) return { label: 'Registration closed', detail: `Start time has passed; waiting to start · ${teams}`, open: false, full };
	if (full) return { label: 'Full', detail: `All ${t.teamCapacity} slots are taken`, open: true, full };
	return { label: 'Registration open', detail: `${teams} registered`, open: true, full };
}

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
	const { slug } = await params;
	const tournament = await getTournament(slug);
	return { title: tournament?.name ?? 'Tournament not found' };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
	const { slug } = await params;
	const tournament = await getTournament(slug);
	if (!tournament) notFound();

	const session = await getAuthSession();
	const user = session?.user;
	const [canManageTournaments, userTeamResponse, champion] = await Promise.all([
		user ? userHasPermission(user.id, 'tournaments:manage') : Promise.resolve(false),
		user ? fetchUserTeam(user.id) : Promise.resolve(null),
		tournament.status === 'COMPLETED' ? getChampion(tournament.id, tournament.format) : Promise.resolve(null),
	]);
	const userTeam: { id: number; name: string } | null = userTeamResponse?.team ?? null;

	const registration = getRegistration(tournament);
	const timeLeftToJoin = Math.max(tournament.startDate.getTime() - Date.now(), 0);

	const detail: TournamentDetail = {
		...tournament,
		startDate: tournament.startDate.toISOString(),
		endDate: tournament.endDate.toISOString(),
	};

	return (
		<div className='container mx-auto max-w-[1400px] px-4 py-6 lg:px-8'>
			<Link href='/tournaments' aria-label='Back to tournaments' className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 -ml-3 text-muted-foreground hover:text-white')}>
				<ArrowLeft className='h-4 w-4' aria-hidden />
				Tournaments
			</Link>

			<header className='overflow-hidden rounded-md border border-border'>
				<div className='relative h-36 w-full bg-neutral-900 sm:h-56 lg:h-64'>
					{tournament.bannerUrl && <Image src={tournament.bannerUrl} alt='' fill priority sizes='(max-width: 1400px) 100vw, 1400px' className='object-cover' />}
					<div aria-hidden className='absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black to-transparent' />
				</div>

				<div className='flex flex-col gap-6 bg-black p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between'>
					<div className='min-w-0'>
						<h1 className='text-balance text-3xl font-black uppercase tracking-wide text-white sm:text-5xl'>{tournament.name}</h1>
						{tournament.organizer.name && (
							<p className='mt-2 text-sm text-muted-foreground'>
								Organized by <span className='text-white'>{tournament.organizer.name}</span>
							</p>
						)}
					</div>

					<div className='flex flex-col gap-3 lg:items-end lg:text-right'>
						<div>
							<p className='text-base font-bold text-white'>{registration.label}</p>
							<p className='font-mono text-sm tabular-nums text-muted-foreground'>{registration.detail}</p>
							{registration.open && timeLeftToJoin > 0 && (
								<div className='font-mono text-sm tabular-nums text-muted-foreground [&>span]:block'>
									<Timer timeLeft={timeLeftToJoin} />
								</div>
							)}
						</div>

						{registration.open && userTeam && <JoinLeaveButton timeLeftToJoin={timeLeftToJoin} tournament={detail} team={userTeam} isFull={registration.full} />}
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

						{canManageTournaments && tournament.status === 'UPCOMING' && (
							<StartTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} teamCount={tournament.teams.length} teamCapacity={tournament.teamCapacity} format={tournament.format} bestOf={tournament.bestOf} />
						)}
					</div>
				</div>
			</header>

			<div className='mt-6'>
				<TabMenu tournament={detail} champion={champion} />
			</div>
		</div>
	);
}
