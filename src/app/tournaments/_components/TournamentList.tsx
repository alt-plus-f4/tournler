import { FeaturedTournament } from '@/components/FeaturedTournament';
import { TournamentRow } from '@/components/TournamentRow';
import { UpcomingTournament } from '@/components/UpcomingTournament';
import type { ReducedTournament } from '@/types/types';

export type ListedTournament = ReducedTournament & { status?: string };

export type TournamentView = 'active' | 'completed';

export const TOURNAMENT_VIEWS: { value: TournamentView; label: string; empty: string }[] = [
	{ value: 'active', label: 'Upcoming & live', empty: 'No upcoming or live tournaments right now.' },
	{ value: 'completed', label: 'Completed', empty: 'No completed tournaments yet.' },
];

/**
 * The /tournaments layout: the top tournament as the hero card, the next three as compact cards,
 * the rest as rows. No directive: rendered on the server for the default view and inside the
 * client browser for views fetched after a filter switch.
 */
export function TournamentList({ tournaments, empty }: { tournaments: ListedTournament[]; empty: string }) {
	if (tournaments.length === 0) return <p className='rounded-md border border-border p-8 text-center text-muted-foreground'>{empty}</p>;

	return (
		<>
			<FeaturedTournament {...tournaments[0]} />

			{tournaments.length > 1 && (
				<div className='mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3'>
					{tournaments.slice(1, 4).map((tournament) => (
						<UpcomingTournament key={tournament.id} {...tournament} />
					))}
				</div>
			)}

			{tournaments.length > 4 && (
				<div className='mt-12 space-y-2'>
					{tournaments.slice(4).map((tournament) => (
						<TournamentRow key={tournament.id} {...tournament} />
					))}
				</div>
			)}
		</>
	);
}
