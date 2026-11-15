import { cn } from '@/lib/utils';
import type { MatchStatus } from './types';

/**
 * Status readout for a match row. LIVE/PAUSED are only ever set from what the game server
 * reported (MatchZy series_start / admin pause over RCON), so only those get a colored label
 * (red LIVE, amber PAUSED) — plain text, no dots.
 */
export function MatchStatusLabel({ status, hasBothTeams, className }: { status: MatchStatus; hasBothTeams: boolean; className?: string }) {
	if (status === 'LIVE') {
		return <span className={cn('inline-flex items-center text-xs font-bold uppercase tracking-widest text-signal-live', className)}>Live</span>;
	}
	if (status === 'PAUSED') {
		return <span className={cn('inline-flex items-center text-xs font-bold uppercase tracking-widest text-signal-hold', className)}>Paused</span>;
	}
	return <span className={cn('text-xs font-bold uppercase tracking-widest text-muted-foreground', className)}>{status === 'COMPLETED' ? 'Final' : hasBothTeams ? 'Scheduled' : 'Awaiting teams'}</span>;
}
