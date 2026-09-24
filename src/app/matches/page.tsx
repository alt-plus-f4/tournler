import { Suspense } from 'react';
import { MatchStatus, type Prisma } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { userHasPermission } from '@/lib/helpers/permissions';
import { CreateMatchButton } from './_components/CreateMatchButton';
import { MatchesBrowser } from './_components/MatchesBrowser';
import type { MatchListItem } from './_components/MatchList';
import { parseStatusFilter, type StatusFilter } from './_components/status';

// Live scores and new lobbies change by the minute; always render per request.
export const dynamic = 'force-dynamic';

const MATCHES_PER_PAGE = 20;

type SearchParams = Promise<{ status?: string | string[]; tournament?: string | string[]; page?: string | string[] }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Same listing GET /api/matches/public serves, read directly instead of fetched client-side after
 * hydration. Served from the data cache (keyed by the filter args) on the live window.
 */
const listMatches = cachedQuery(async (status: StatusFilter, tournamentId: number | undefined, page: number) => {
	const statusWhere: Prisma.MatchesWhereInput['status'] =
		status === 'ALL' ? undefined : status === 'LIVE' ? { in: [MatchStatus.LIVE, MatchStatus.PAUSED] } : MatchStatus[status];
	const where: Prisma.MatchesWhereInput = {
		...(statusWhere ? { status: statusWhere } : {}),
		...(tournamentId ? { tournamentId } : {}),
	};
	const side = { select: { id: true, name: true, logo: true } } as const;

	const [rows, total] = await Promise.all([
		db.matches.findMany({
			where,
			orderBy: { matchDate: status === 'SCHEDULED' ? 'asc' : 'desc' },
			select: {
				id: true,
				status: true,
				matchDate: true,
				isPickup: true,
				scoreTeamA: true,
				scoreTeamB: true,
				winnerSide: true,
				teamAName: true,
				teamBName: true,
				tournament: { select: { id: true, name: true } },
				teamA: side,
				teamB: side,
				winner: side,
				_count: { select: { participants: true } },
			},
			skip: (page - 1) * MATCHES_PER_PAGE,
			take: MATCHES_PER_PAGE,
		}),
		db.matches.count({ where }),
	]);

	const matches: MatchListItem[] = rows.map(({ _count, matchDate, ...m }) => ({ ...m, matchDate: matchDate.toISOString(), participantCount: _count.participants }));
	return { matches, totalPages: Math.max(1, Math.ceil(total / MATCHES_PER_PAGE)) };
}, ['matches-public-list'], { tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live });

// Same set the old client fetch used (GET /api/tournaments?limit=100), names only.
const getTournamentOptions = cachedQuery(
	async () => db.cs2Tournament.findMany({ where: { isSystem: false }, orderBy: { prizePool: 'desc' }, take: 100, select: { id: true, name: true } }),
	['matches-tournament-options'],
	{ tags: ['tournaments'], revalidate: REVALIDATE.standard },
);

async function MatchesSection({ status, tournamentId, page }: { status: StatusFilter; tournamentId: string; page: number }) {
	const [tournaments, { matches, totalPages }] = await Promise.all([
		getTournamentOptions(),
		listMatches(status, tournamentId ? Number(tournamentId) : undefined, page),
	]);

	return <MatchesBrowser status={status} tournamentId={tournamentId} page={page} totalPages={totalPages} tournaments={tournaments} matches={matches} />;
}

function MatchesSkeleton() {
	return (
		<div role='status' aria-busy='true'>
			<span className='sr-only'>Loading matches…</span>
			<div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' aria-hidden>
				<div className='flex flex-wrap gap-2'>
					{[44, 48, 76, 88].map((w) => (
						<Skeleton key={w} className='h-9 rounded-md bg-neutral-900' style={{ width: w }} />
					))}
				</div>
				<Skeleton className='h-10 w-full rounded-md bg-neutral-900 sm:w-56' />
			</div>
			<div className='space-y-2' aria-hidden>
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
				))}
			</div>
			{/* Pagination row */}
			<div className='mt-4 h-10' aria-hidden />
		</div>
	);
}

export default async function MatchesPage({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams;
	const status = parseStatusFilter(first(query.status));
	const rawTournament = first(query.tournament);
	const tournamentId = rawTournament && /^\d{1,9}$/.test(rawTournament) ? rawTournament : '';
	const page = Math.max(1, Number.parseInt(first(query.page) ?? '1', 10) || 1);

	const session = await getAuthSession();
	const canCreateMatch = session ? await userHasPermission(session.user.id, 'matches:manage') : false;

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
			<div className='mb-6 flex items-center justify-between gap-3'>
				<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Matches</h1>
				{canCreateMatch && <CreateMatchButton />}
			</div>

			<Suspense fallback={<MatchesSkeleton />}>
				<MatchesSection status={status} tournamentId={tournamentId} page={page} />
			</Suspense>
		</div>
	);
}
