import { TeamCard } from '@/components/TeamCard';
import { TeamRosterList } from '@/components/TeamRosterList';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import type { ExtendedCs2Team } from '@/lib/models/team-model';
import type { Game } from '@prisma/client';
import { GAME_META } from '@/lib/games';

const TEAMS_LIMIT = 100;

export function TeamsCardsSkeleton() {
	return (
		<>
			<span role='status' className='sr-only'>
				Loading teams…
			</span>
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} aria-hidden className='h-[210px] w-full rounded-md bg-neutral-900' />
			))}
		</>
	);
}

/**
 * Same shape GET /api/teams returned (public member fields only), read directly instead of over
 * HTTP. Shared by every viewer, so it lives in the data cache (rosters carry user names/avatars).
 */
const listTeams = cachedQuery(
	(game: Game | null) =>
		db.cs2Team.findMany({
			where: game ? { game } : undefined,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				name: true,
				game: true,
				members: { select: { id: true, name: true, image: true, bio: true } },
				capitanId: true,
				logo: true,
				background: true,
				createdAt: true,
				updatedAt: true,
			},
			take: TEAMS_LIMIT,
		}),
	['teams-list', String(TEAMS_LIMIT), 'by-game'],
	{ tags: ['teams', 'users'], revalidate: REVALIDATE.standard },
);

/** `game` null = every game (the one feed); otherwise just that game's teams. */
export async function TeamsCards({ game = null }: { game?: Game | null }) {
	let teams: Awaited<ReturnType<typeof listTeams>>;
	try {
		teams = await listTeams(game);
	} catch (error) {
		console.error('Error fetching teams:', error);
		return (
			<div role='alert' className='col-span-full rounded-md border border-signal-live/20 bg-signal-live/10 px-4 py-12 text-center'>
				<p className='font-semibold'>Teams couldn&apos;t be loaded</p>
				<p className='mt-1 text-sm text-muted-foreground'>Reload the page to try again.</p>
			</div>
		);
	}

	if (!teams.length) {
		return (
			<div className='col-span-full rounded-md border border-border px-4 py-12 text-center'>
				<p className='font-semibold'>{game ? `No ${GAME_META[game].label} teams yet` : 'No teams yet'}</p>
				<p className='mt-1 text-sm text-muted-foreground'>The first team created will show up here.</p>
			</div>
		);
	}

	return (
		<>
			{teams.map((team) => (
				<TeamCard
					key={team.id}
					team={team as unknown as ExtendedCs2Team}
					roster={<TeamRosterList members={team.members} captainId={team.capitanId} label={`${team.name} roster`} />}
				/>
			))}
		</>
	);
}
