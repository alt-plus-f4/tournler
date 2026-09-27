import type { ReactNode } from 'react';
import Link from 'next/link';
import { GameTag } from '@/components/games/GameMark';
import { ExtendedCs2Team } from '@/lib/models/team-model';
import { cn } from '@/lib/utils';
import { TeamBanner } from './TeamBanner';

const TEAM_SIZE = 5;

/**
 * Team tile linking to the team page. `roster`, when given, renders under the linked part (not
 * inside the <a>), so it can hold its own player links; the tile then only brightens its border
 * on hover instead of zooming, since the roster rows have their own hover.
 */
export function TeamCard({ team, roster }: { team: ExtendedCs2Team; roster?: ReactNode }) {
	const memberCount = team.members.length;
	const openSlots = Math.max(0, TEAM_SIZE - memberCount);
	const rosterLabel = openSlots === 0 ? 'Full roster' : `${openSlots} ${openSlots === 1 ? 'slot' : 'slots'} open`;

	const link = (
		<Link
			href={`/teams/${team.id}`}
			className={cn(
				'group block w-full cursor-pointer overflow-hidden bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
				roster ? 'rounded-t-md' : 'rounded-md border border-border hover:border-neutral-500 motion-safe:hover:scale-105',
			)}
		>
			<div className='relative h-[150px] w-full overflow-hidden'>
				<TeamBanner capitanId={team.capitanId ?? ''} team={team} interactive={false} />
			</div>
			<div className='flex flex-col gap-1 border-t border-border px-4 pt-3 pb-3'>
				<div className='flex min-w-0 items-center justify-between gap-2'>
					<h3 className='truncate text-lg font-black uppercase leading-tight tracking-wide underline-offset-4 group-hover:underline'>{team.name}</h3>
					{/* Some callers' selects predate teams having a game; show the tag only when it's there. */}
					{team.game && <GameTag game={team.game} />}
				</div>
				<p className='flex items-center justify-between text-xs text-muted-foreground'>
					<span className={openSlots === 0 ? 'font-semibold text-white' : undefined}>{rosterLabel}</span>
					<span className='font-mono tabular-nums text-white'>
						{memberCount}/{TEAM_SIZE}
						<span className='sr-only'> players</span>
					</span>
				</p>
			</div>
		</Link>
	);

	if (!roster) return link;

	return (
		<div className='overflow-hidden rounded-md border border-border bg-card transition-colors has-[>a:hover]:border-neutral-500'>
			{link}
			<div className='border-t border-border'>{roster}</div>
		</div>
	);
}
