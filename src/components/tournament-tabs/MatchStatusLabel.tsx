import { cn } from '@/lib/utils';
import type { MatchStatus } from './types';

/**
 * Status readout for a match row. LIVE/PAUSED are only ever set from what the game server
 * reported (MatchZy series_start / admin pause over RCON), so only those get a signal dot, and
 * only LIVE pulses.
 */
export function MatchStatusLabel({ status, hasBothTeams, className }: { status: MatchStatus; hasBothTeams: boolean; className?: string }) {
	if (status === 'LIVE') {
		return (
			<span className={cn('inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white', className)}>
				<span className='relative inline-flex h-2 w-2' aria-hidden>
					<span className='absolute inset-0 rounded-full bg-signal-live opacity-75 motion-safe:animate-ping' />
					<span className='relative inline-flex h-2 w-2 rounded-full bg-signal-live' />
				</span>
				Live
			</span>
		);
	}
	if (status === 'PAUSED') {
		return (
			<span className={cn('inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-signal-hold', className)}>
				<span className='inline-flex h-2 w-2 rounded-full bg-signal-hold' aria-hidden />
				Paused
			</span>
		);
	}
	return <span className={cn('text-xs font-bold uppercase tracking-widest text-muted-foreground', className)}>{status === 'COMPLETED' ? 'Final' : hasBothTeams ? 'Scheduled' : 'Awaiting teams'}</span>;
}
