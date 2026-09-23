import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

const teamSelect = { select: { name: true, logo: true } } as const;

/**
 * Matches the game servers are actually reporting as in progress right now (the server flipped
 * them via MatchZy's series_start). The homepage leads with these when there are any; otherwise
 * it leads with the rewatch player instead — this panel never renders an empty placeholder.
 */
export async function getLiveMatches() {
	return db.matches.findMany({
		where: { status: { in: ['LIVE', 'PAUSED'] } },
		orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
		take: 4,
		include: {
			tournament: { select: { name: true } },
			teamA: teamSelect,
			teamB: teamSelect,
			maps: { where: { status: 'LIVE' }, take: 1, select: { mapName: true, scoreTeamA: true, scoreTeamB: true } },
		},
	});
}

export type LiveMatch = Awaited<ReturnType<typeof getLiveMatches>>[number];

type Side = { name: string; logo: string | null | undefined };

function sideLabels(match: { isPickup: boolean; teamAName: string | null; teamBName: string | null; teamA: { name: string; logo: string | null } | null; teamB: { name: string; logo: string | null } | null }): [Side, Side] {
	if (match.isPickup) return [{ name: match.teamAName || 'Side A', logo: null }, { name: match.teamBName || 'Side B', logo: null }];
	return [
		{ name: match.teamA?.name ?? 'TBD', logo: match.teamA?.logo },
		{ name: match.teamB?.name ?? 'TBD', logo: match.teamB?.logo },
	];
}

function formatMapName(mapName: string) {
	return mapName.replace(/^de_/, '').replace(/^\w/, (c) => c.toUpperCase());
}

function TeamMark({ side, align }: { side: Side; align: 'start' | 'end' }) {
	return (
		<div className={cn('flex min-w-0 items-center gap-3', align === 'end' ? 'flex-row-reverse text-right' : 'text-left')}>
			{side.logo ? (
				<Image src={side.logo} alt='' width={48} height={48} className='h-8 w-8 shrink-0 object-contain sm:h-12 sm:w-12' />
			) : (
				<span aria-hidden className='flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-neutral-900 font-mono text-xs text-muted-foreground sm:h-12 sm:w-12'>
					{side.name.slice(0, 2).toUpperCase()}
				</span>
			)}
			<span className='truncate text-lg font-black uppercase tracking-wide text-white sm:text-3xl'>{side.name}</span>
		</div>
	);
}

function Scoreline({ a, b, sideA, sideB }: { a: string; b: string; sideA: Side; sideB: Side }) {
	return (
		<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6'>
			<TeamMark side={sideA} align='start' />
			<p className='font-mono text-3xl font-bold tabular-nums text-white sm:text-5xl' aria-label={`${sideA.name} ${a}, ${sideB.name} ${b}`}>
				{a}
				<span className='px-2 text-muted-foreground sm:px-3'>:</span>
				{b}
			</p>
			<TeamMark side={sideB} align='end' />
		</div>
	);
}

export function OnAirPanel({ matches }: { matches: LiveMatch[] }) {
	if (matches.length === 0) return null;
	const [featured, ...others] = matches;
	const [sideA, sideB] = sideLabels(featured);
	const liveMap = featured.maps[0];
	const isPaused = featured.status === 'PAUSED';

	return (
		<section aria-labelledby='on-air-heading' className='overflow-hidden rounded-md border border-border bg-black'>
			<h2 id='on-air-heading' className='sr-only'>
				Live now
			</h2>
			<Link href={`/matches/${featured.id}`} className='block p-5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-8'>
				<div className='mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm'>
					{isPaused ? (
						<span className='inline-flex items-center gap-2 font-bold text-signal-hold'>
							<span className='h-2 w-2 rounded-full bg-signal-hold' /> PAUSED
						</span>
					) : (
						<span className='inline-flex items-center gap-2 font-bold text-white'>
							<span className='h-2 w-2 rounded-full bg-signal-live motion-safe:animate-pulse' /> LIVE
						</span>
					)}
					<span className='truncate text-muted-foreground'>{featured.tournament.name}</span>
				</div>
				<Scoreline a={String(featured.scoreTeamA ?? 0)} b={String(featured.scoreTeamB ?? 0)} sideA={sideA} sideB={sideB} />
				{liveMap && (
					<p className='mt-5 text-center text-sm text-muted-foreground'>
						{formatMapName(liveMap.mapName)} · <span className='font-mono tabular-nums text-neutral-300'>{liveMap.scoreTeamA ?? 0} : {liveMap.scoreTeamB ?? 0}</span> rounds
					</p>
				)}
			</Link>
			{others.length > 0 && (
				<ul className='divide-y divide-border border-t border-border'>
					{others.map((match) => {
						const [a, b] = sideLabels(match);
						return (
							<li key={match.id}>
								<Link href={`/matches/${match.id}`} className='flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-white/[0.03] sm:px-8'>
									<span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', match.status === 'PAUSED' ? 'bg-signal-hold' : 'bg-signal-live motion-safe:animate-pulse')} aria-hidden />
									<span className='sr-only'>{match.status === 'PAUSED' ? 'Paused' : 'Live'}:</span>
									<span className='min-w-0 flex-1 truncate text-white'>
										{a.name} <span className='text-muted-foreground'>vs</span> {b.name}
									</span>
									<span className='font-mono tabular-nums text-white'>
										{match.scoreTeamA ?? 0} : {match.scoreTeamB ?? 0}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
