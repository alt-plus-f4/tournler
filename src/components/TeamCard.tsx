import Link from 'next/link';
import { SiCounterstrike } from 'react-icons/si';
import { ExtendedCs2Team } from '@/lib/models/team-model';
import { TeamBanner } from './TeamBanner';

const TEAM_SIZE = 5;

export function TeamCard({ team }: { team: ExtendedCs2Team }) {
	const memberCount = team.members.length;
	const openSlots = Math.max(0, TEAM_SIZE - memberCount);
	const rosterLabel = openSlots === 0 ? 'Full roster' : `${openSlots} ${openSlots === 1 ? 'slot' : 'slots'} open`;

	return (
		<Link
			href={`/teams/${team.id}`}
			className='group block w-full overflow-hidden rounded-md border border-border bg-card transition hover:border-neutral-500 motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
		>
			<div className='relative h-[150px] w-full overflow-hidden'>
				<TeamBanner capitanId={team.capitanId ?? ''} team={team} interactive={false} />
			</div>
			<div className='flex flex-col gap-1 border-t border-border px-4 pt-3 pb-3'>
				<div className='flex min-w-0 items-center gap-2'>
					<SiCounterstrike aria-hidden className='h-5 w-5 shrink-0' />
					<h3 className='truncate text-lg font-black uppercase leading-tight tracking-wide'>{team.name}</h3>
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
}
