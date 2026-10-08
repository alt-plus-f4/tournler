import { TeamLogo } from '@/components/TeamLogo';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { GameTag } from '@/components/games/GameMark';
import { LiveStream } from '@/components/home/LiveStream';
import { Radio } from 'lucide-react';

const teamSelect = { select: { name: true, logo: true } } as const;

/**
 * Matches the game servers are actually reporting as in progress right now (the server flipped
 * them via MatchZy's series_start). The homepage leads with these when there are any; otherwise
 * it leads with the rewatch player instead — this panel never renders an empty placeholder.
 */
export const getLiveMatches = cachedQuery(
	async () =>
		db.matches.findMany({
			where: { status: { in: ['LIVE', 'PAUSED'] } },
			orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
			take: 4,
			include: {
				tournament: { select: { name: true, game: true } },
				teamA: teamSelect,
				teamB: teamSelect,
				maps: { where: { status: 'LIVE' }, take: 1, select: { mapName: true, scoreTeamA: true, scoreTeamB: true } },
			},
		}),
	['home-live-matches'],
	{ tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.live },
);

export type LiveMatch = Awaited<ReturnType<typeof getLiveMatches>>[number];

type Side = { name: string; logo: string | null | undefined };

function sideLabels(match: {
	isPickup: boolean;
	teamAName: string | null;
	teamBName: string | null;
	teamA: { name: string; logo: string | null } | null;
	teamB: { name: string; logo: string | null } | null;
}): [Side, Side] {
	if (match.isPickup)
		return [
			{ name: match.teamAName || 'Side A', logo: null },
			{ name: match.teamBName || 'Side B', logo: null },
		];
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
			<TeamLogo src={side.logo} name={side.name} decorative size='sm' className='sm:h-12 sm:w-12 sm:p-1.5 sm:text-sm' />
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
			<Link href={`/matches/${featured.id}`} className='block p-[0.725rem] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
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
					<span className='inline-flex min-w-0 items-center gap-2 truncate text-muted-foreground'>
						<GameTag game={featured.tournament.game} showLabel={false} />
						{featured.tournament.name}
					</span>
				</div>
				<Scoreline a={String(featured.scoreTeamA ?? 0)} b={String(featured.scoreTeamB ?? 0)} sideA={sideA} sideB={sideB} />
				{liveMap && (
					<p className='mt-5 text-center text-sm text-muted-foreground'>
						{formatMapName(liveMap.mapName)} ·{' '}
						<span className='font-mono tabular-nums text-neutral-300'>
							{liveMap.scoreTeamA ?? 0} : {liveMap.scoreTeamB ?? 0}
						</span>{' '}
						rounds
					</p>
				)}
			</Link>
			{featured.streamUrl && <LiveStream streamUrl={featured.streamUrl} label={`${sideA.name} vs ${sideB.name}`} />}
			{others.length > 0 && (
				<ul className='divide-y divide-border border-t border-border'>
					{others.map((match) => {
						const [a, b] = sideLabels(match);
						return (
							<li key={match.id} className='flex items-center'>
								<Link href={`/matches/${match.id}`} className='flex min-w-0 flex-1 items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-white/[0.03] sm:px-8'>
									<span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', match.status === 'PAUSED' ? 'bg-signal-hold' : 'bg-signal-live motion-safe:animate-pulse')} aria-hidden />
									<span className='sr-only'>{match.status === 'PAUSED' ? 'Paused' : 'Live'}:</span>
									<GameTag game={match.tournament.game} showLabel={false} className='shrink-0' />
									<span className='min-w-0 flex-1 truncate text-white'>
										{a.name} <span className='text-muted-foreground'>vs</span> {b.name}
									</span>
									<span className='font-mono tabular-nums text-white'>
										{match.scoreTeamA ?? 0} : {match.scoreTeamB ?? 0}
									</span>
								</Link>
								{match.streamUrl && (
									<a
										href={match.streamUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='mr-5 inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-white sm:mr-8'
									>
										<Radio className='h-3.5 w-3.5' aria-hidden />
										<span className='sr-only sm:not-sr-only'>Stream</span>
										<span className='sr-only'>
											for {a.name} vs {b.name}
										</span>
									</a>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
