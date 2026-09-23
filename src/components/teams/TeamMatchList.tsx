import Link from 'next/link';
import type { MatchStatus } from '@prisma/client';

export interface TeamMatchItem {
	id: number;
	status: MatchStatus;
	matchDate: Date;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winnerId: number | null;
	teamAId: number | null;
	teamBId: number | null;
	teamA: { id: number; name: string } | null;
	teamB: { id: number; name: string } | null;
	tournament: { id: number; name: string };
}

function formatDate(date: Date) {
	return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusCell({ match, teamId }: { match: TeamMatchItem; teamId: number }) {
	if (match.status === 'LIVE') {
		return (
			<span className='inline-flex items-center gap-1.5 text-xs font-bold text-white'>
				<span aria-hidden className='h-2 w-2 animate-pulse rounded-full bg-signal-live' />
				LIVE
			</span>
		);
	}
	if (match.status === 'PAUSED') {
		return (
			<span className='inline-flex items-center gap-1.5 text-xs font-bold text-signal-hold'>
				<span aria-hidden className='h-2 w-2 rounded-full bg-signal-hold' />
				PAUSED
			</span>
		);
	}
	if (match.status === 'COMPLETED') {
		if (match.winnerId == null) return <span className='text-xs text-muted-foreground'>Final</span>;
		return match.winnerId === teamId ? <span className='text-xs font-bold text-white'>Win</span> : <span className='text-xs text-muted-foreground'>Loss</span>;
	}
	return <span className='text-xs text-muted-foreground'>Upcoming</span>;
}

/** A team's matches, from that team's point of view: its score first, then the opponent's. */
export function TeamMatchList({ matches, teamId }: { matches: TeamMatchItem[]; teamId: number }) {
	if (matches.length === 0) {
		return (
			<div className='rounded-md border border-border px-4 py-10 text-center'>
				<p className='font-semibold'>No matches yet</p>
				<p className='mt-1 text-sm text-muted-foreground'>
					Matches show up here once this team plays in a tournament.{' '}
					<Link href='/tournaments' className='text-white underline underline-offset-4'>
						Browse tournaments
					</Link>
				</p>
			</div>
		);
	}

	return (
		<ul className='space-y-2'>
			{matches.map((match) => {
				const isTeamA = match.teamAId === teamId;
				const opponent = isTeamA ? match.teamB : match.teamA;
				const ownScore = isTeamA ? match.scoreTeamA : match.scoreTeamB;
				const opponentScore = isTeamA ? match.scoreTeamB : match.scoreTeamA;
				// A completed match with a tied/empty score was decided by hand (forced result), so a
				// scoreline like "0 : 0 · Win" would contradict itself — show no score instead.
				const tiedFinal = match.status === 'COMPLETED' && (match.scoreTeamA ?? 0) === (match.scoreTeamB ?? 0);
				const hasScore = match.status !== 'SCHEDULED' && !tiedFinal;
				const won = match.status === 'COMPLETED' && match.winnerId === teamId;
				const lost = match.status === 'COMPLETED' && match.winnerId != null && match.winnerId !== teamId;

				return (
					<li key={match.id}>
						<Link
							href={`/matches/${match.id}`}
							className='flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
						>
							<span className='hidden w-28 shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground sm:block'>{formatDate(match.matchDate)}</span>
							<div className='min-w-0 flex-1'>
								<p className='truncate text-sm font-bold uppercase'>
									<span className='font-normal normal-case text-muted-foreground'>vs </span>
									{opponent?.name ?? 'TBD'}
								</p>
								<p className='truncate text-xs text-muted-foreground'>
									<span className='sm:hidden'>{formatDate(match.matchDate)} · </span>
									{match.tournament.name}
								</p>
							</div>
							<span className='w-16 shrink-0 text-center font-mono text-sm tabular-nums'>
								{hasScore ? (
									<>
										<span className={lost ? 'text-muted-foreground' : 'font-bold text-white'}>{ownScore ?? 0}</span>
										<span className='text-muted-foreground'> : </span>
										<span className={won ? 'text-muted-foreground' : 'font-bold text-white'}>{opponentScore ?? 0}</span>
									</>
								) : (
									<span className='text-muted-foreground' aria-label={tiedFinal ? 'No deciding score' : undefined}>{tiedFinal ? '–' : 'vs'}</span>
								)}
							</span>
							<span className='w-16 shrink-0 text-right'>
								<StatusCell match={match} teamId={teamId} />
							</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
