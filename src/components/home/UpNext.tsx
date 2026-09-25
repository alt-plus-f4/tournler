import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { LocalTime } from '@/components/LocalTime';
import { DRAFT_POOL_SIZE } from '@/lib/tournaments/draft';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { GameTag } from '@/components/games/GameMark';

const MAX_ROWS = 5;
// Mirrors the join route's caps: OPEN = 5 per side, CAPTAIN_DRAFT = 2 captains + the pool.
const OPEN_LOBBY_SIZE = 10;
const DRAFT_LOBBY_SIZE = 2 + DRAFT_POOL_SIZE;

/**
 * Everything that could go on air next: open pickup lobbies (joinable right now) and scheduled
 * team matches. A team match still SCHEDULED after its matchDate is shown as "Awaiting start"
 * rather than hidden or given a fake time — it's still the next thing that will happen.
 */
// Cached for REVALIDATE.live: the future/overdue split is computed against the time the entry was
// filled, so it can lag the real clock by at most that window.
export const getUpNext = cachedQuery(async () => {
	const now = new Date();
	const [pickups, teamMatches] = await Promise.all([
		db.matches.findMany({
			where: { status: 'SCHEDULED', isPickup: true },
			orderBy: { matchDate: 'asc' },
			take: MAX_ROWS,
			select: { id: true, pickupMode: true, _count: { select: { participants: true } } },
		}),
		db.matches.findMany({
			where: { status: 'SCHEDULED', isPickup: false, teamAId: { not: null }, teamBId: { not: null } },
			orderBy: { matchDate: 'asc' },
			take: MAX_ROWS * 2,
			select: { id: true, matchDate: true, tournament: { select: { name: true, game: true } }, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
		}),
	]);

	// Genuinely upcoming first (soonest first), then overdue ones (most recently due first).
	const future = teamMatches.filter((m) => m.matchDate >= now);
	const overdue = teamMatches.filter((m) => m.matchDate < now).reverse();

	const rows = [
		...pickups.map((m) => ({ kind: 'pickup' as const, id: m.id, mode: m.pickupMode, joined: m._count.participants, capacity: m.pickupMode === 'CAPTAIN_DRAFT' ? DRAFT_LOBBY_SIZE : OPEN_LOBBY_SIZE })),
		...future.map((m) => ({ kind: 'team' as const, id: m.id, teamA: m.teamA?.name ?? 'TBD', teamB: m.teamB?.name ?? 'TBD', tournament: m.tournament.name, game: m.tournament.game, matchDate: m.matchDate.toISOString(), overdue: false })),
		...overdue.map((m) => ({ kind: 'team' as const, id: m.id, teamA: m.teamA?.name ?? 'TBD', teamB: m.teamB?.name ?? 'TBD', tournament: m.tournament.name, game: m.tournament.game, matchDate: m.matchDate.toISOString(), overdue: true })),
	];
	return rows.slice(0, MAX_ROWS);
}, ['home-up-next'], { tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live });

type UpNextRow = Awaited<ReturnType<typeof getUpNext>>[number];

const rowClass = 'group flex min-h-14 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5';

function Row({ row }: { row: UpNextRow }) {
	if (row.kind === 'pickup') {
		const full = row.joined >= row.capacity;
		return (
			<Link href={`/matches/${row.id}`} className={rowClass}>
				<GameTag game='CS2' showLabel={false} className='shrink-0' />
				<span className='min-w-0 flex-1'>
					<span className='block truncate font-bold uppercase tracking-wide text-white'>Pickup lobby</span>
					<span className='block truncate text-xs text-muted-foreground'>{row.mode === 'CAPTAIN_DRAFT' ? 'Captain draft' : 'Open sides'}</span>
				</span>
				<span className='shrink-0 text-muted-foreground'>
					<span className='font-mono tabular-nums text-white'>
						{row.joined}/{row.capacity}
					</span>{' '}
					joined
				</span>
				<span className='inline-flex shrink-0 items-center gap-0.5 font-medium text-white'>
					{full ? 'View' : 'Join'}
					<ChevronRight aria-hidden className='h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5' />
				</span>
			</Link>
		);
	}

	return (
		<Link href={`/matches/${row.id}`} className={rowClass}>
			<GameTag game={row.game} showLabel={false} className='shrink-0' />
			<span className='min-w-0 flex-1'>
				<span className='block truncate font-bold uppercase tracking-wide text-white'>
					{row.teamA} <span className='font-normal normal-case text-muted-foreground'>vs</span> {row.teamB}
				</span>
				<span className='block truncate text-xs text-muted-foreground'>{row.tournament}</span>
			</span>
			{row.overdue ? <span className='shrink-0 text-muted-foreground'>Awaiting start</span> : <LocalTime iso={row.matchDate} className='shrink-0 font-mono text-xs tabular-nums text-neutral-300 sm:text-sm' />}
			<ChevronRight aria-hidden className='h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5' />
		</Link>
	);
}

export function UpNext({ rows }: { rows: UpNextRow[] }) {
	return (
		<section aria-labelledby='up-next-heading'>
			<div className='mb-3 flex items-center justify-between'>
				<h2 id='up-next-heading' className='text-xl font-bold tracking-tight'>
					Up next
				</h2>
				<Link href='/matches' className='text-sm font-medium uppercase text-muted-foreground transition-colors hover:text-white'>
					All matches
				</Link>
			</div>
			{rows.length > 0 ? (
				<ul className='divide-y divide-border overflow-hidden rounded-md border border-border bg-black'>
					{rows.map((row) => (
						<li key={row.id}>
							<Row row={row} />
						</li>
					))}
				</ul>
			) : (
				<div className='flex flex-col gap-3 rounded-md border border-border bg-black px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5'>
					<p className='text-muted-foreground'>No matches scheduled and no open lobbies right now.</p>
					<Link href='/matches' className='shrink-0 font-medium text-white underline-offset-4 hover:underline'>
						Start a pickup lobby
					</Link>
				</div>
			)}
		</section>
	);
}
