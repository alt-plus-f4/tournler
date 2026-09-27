'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Game, TournamentFormat } from '@prisma/client';
import { hostsGameServers } from '@/lib/tournaments/game-rules';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

const FORMAT_LABEL: Record<TournamentFormat, string> = {
	SINGLE_ELIMINATION: 'Single elimination',
	DOUBLE_ELIMINATION: 'Double elimination',
	ROUND_ROBIN: 'Round robin',
};

// Mirrors the guards in startTournament() (src/lib/tournaments/tournament-service.ts) so the
// dialog explains a refusal up front instead of after the request fails.
const MIN_TEAMS: Record<TournamentFormat, number> = {
	SINGLE_ELIMINATION: 2,
	ROUND_ROBIN: 2,
	DOUBLE_ELIMINATION: 4,
};

interface StartTournamentButtonProps {
	tournamentId: number;
	tournamentName: string;
	teamCount: number;
	teamCapacity: number;
	format: TournamentFormat;
	bestOf: number;
	game: Game;
}

export function StartTournamentButton({ tournamentId, tournamentName, teamCount, teamCapacity, format, bestOf, game }: StartTournamentButtonProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [isStarting, setIsStarting] = useState(false);

	const minTeams = MIN_TEAMS[format];
	const tooFew = teamCount < minTeams;
	const openSlots = Math.max(teamCapacity - teamCount, 0);

	const handleStartTournament = async () => {
		setIsStarting(true);

		try {
			const response = await fetch('/api/tournaments/start', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ tournamentId }),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to start tournament');
			}

			setOpen(false);
			toast({
				title: 'Tournament started',
				description: typeof payload?.matchesCreated === 'number' ? `${tournamentName}: ${payload.matchesCreated} matches created.` : `${tournamentName} has started.`,
			});
			router.refresh();
		} catch (error) {
			console.error('Failed to start tournament', error);
			toast({
				variant: 'destructive',
				title: 'Could not start tournament',
				description: error instanceof Error ? error.message : 'An unexpected error occurred',
			});
		} finally {
			setIsStarting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !isStarting && setOpen(next)}>
			<DialogTrigger asChild>
				<Button variant='outline'>Start tournament</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Start {tournamentName}?</DialogTitle>
					<DialogDescription>Registration closes and the bracket is locked to the teams registered now. This can&apos;t be undone.</DialogDescription>
				</DialogHeader>

				<dl className='grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border text-sm'>
					<div className='bg-background p-3'>
						<dt className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Teams</dt>
						<dd className='mt-1 font-mono text-lg font-bold tabular-nums text-white'>
							{teamCount}
							<span className='text-muted-foreground'>/{teamCapacity}</span>
						</dd>
					</div>
					<div className='bg-background p-3'>
						<dt className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Format</dt>
						<dd className='mt-1 text-white'>
							{FORMAT_LABEL[format]} <span className='text-muted-foreground'>· Best of {bestOf}</span>
						</dd>
					</div>
				</dl>

				{tooFew ? (
					<p role='alert' className='text-sm text-signal-live'>
						{FORMAT_LABEL[format]} needs at least {minTeams} teams to start. {teamCount === 0 ? 'No teams have' : `Only ${teamCount} ${teamCount === 1 ? 'team has' : 'teams have'}`} registered.
					</p>
				) : (
					openSlots > 0 && (
						<p className='text-sm text-muted-foreground'>
							{openSlots} {openSlots === 1 ? 'slot is' : 'slots are'} still open. Teams can&apos;t join after you start.
						</p>
					)
				)}

				<div className='space-y-2 text-sm'>
					<h3 className='font-bold text-white'>What happens next</h3>
					<ol className='list-decimal space-y-1 pl-5 text-muted-foreground'>
						<li>The bracket is generated and every match is created.</li>
						{hostsGameServers(game) ? (
							<>
								<li>About 5 minutes before each match starts, a CS2 server from the pool is loaded with it.</li>
								<li>Scores come from the game server, and winners advance automatically.</li>
							</>
						) : (
							<li>Teams play each match in the League client; an organizer records the result and the bracket advances.</li>
						)}
					</ol>
				</div>

				<DialogFooter className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0'>
					<DialogClose asChild>
						<Button variant='outline' disabled={isStarting}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={handleStartTournament} disabled={tooFew || isStarting} isLoading={isStarting}>
						{isStarting ? 'Starting…' : 'Start tournament'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
