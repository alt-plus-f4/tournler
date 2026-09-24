'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { GAME_META } from '@/lib/games';
import type { Game } from '@prisma/client';

export type RosterAccountStatus = 'linked' | 'pending' | 'missing';

export interface GateRosterEntry {
	id: string;
	name: string | null;
	status: RosterAccountStatus;
	isViewer: boolean;
}

/** Monochrome status text + icon (see DESIGN.md's On-Air Rule — this isn't server state, so no signal color). */
function StatusMark({ status }: { status: RosterAccountStatus }) {
	if (status === 'linked') {
		return (
			<span className='inline-flex items-center gap-1.5 font-medium text-white'>
				<Check className='h-3.5 w-3.5' aria-hidden />
				Linked
			</span>
		);
	}
	if (status === 'pending') {
		return (
			<span className='inline-flex items-center gap-1.5 text-neutral-300'>
				<Clock className='h-3.5 w-3.5' aria-hidden />
				Verification pending
			</span>
		);
	}
	return (
		<span className='inline-flex items-center gap-1.5 text-muted-foreground'>
			<XIcon className='h-3.5 w-3.5' aria-hidden />
			Not linked
		</span>
	);
}

/**
 * The registration control for a signed-in captain (or teammate) whose team isn't eligible yet —
 * every rostered player needs the tournament game's account linked (`teamEligibility`, enforced
 * the same way by `POST /api/tournaments/[slug]/teams`). Opens a dialog naming each player's
 * status instead of silently disabling Register, since "why can't we register" has a real answer.
 */
export function RegistrationGate({ game, teamName, viewerId, viewerNeedsLink, missingCount, roster }: { game: Game; teamName: string; viewerId: string; viewerNeedsLink: boolean; missingCount: number; roster: GateRosterEntry[] }) {
	const [open, setOpen] = useState(false);
	const meta = GAME_META[game];

	const triggerLabel = viewerNeedsLink ? `${meta.accountAction} to register` : `${missingCount} player${missingCount === 1 ? '' : 's'} still need${missingCount === 1 ? 's' : ''} ${meta.account}`;

	return (
		<>
			<Button variant='outline' onClick={() => setOpen(true)}>
				{triggerLabel}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='sm:max-w-sm'>
					<DialogHeader>
						<DialogTitle>
							{teamName} · {meta.label} check
						</DialogTitle>
						<DialogDescription>
							Every rostered player needs a {meta.account.toLowerCase() === 'steam' ? 'linked Steam account' : 'verified Riot ID'} before {teamName} can register.
						</DialogDescription>
					</DialogHeader>

					<ul className='divide-y divide-border rounded-md border border-border'>
						{roster.map((player) => (
							<li key={player.id} className='flex items-center justify-between gap-3 px-3 py-2 text-sm'>
								<span className='min-w-0 truncate'>
									{player.name ?? 'Unnamed player'}
									{player.isViewer && <span className='text-muted-foreground'> · you</span>}
								</span>
								<StatusMark status={player.status} />
							</li>
						))}
					</ul>

					<p className='text-xs text-muted-foreground'>Only a player can link their own account — a captain can&apos;t link it for a teammate. Ask anyone marked "Not linked" to do it themselves.</p>

					<Button asChild>
						<Link href={`/profile/${viewerId}#accounts`}>Link my account</Link>
					</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}

/** Team registered for a different game than this tournament: no dialog, just the fact and a way out. */
export function WrongGameNotice({ tournamentGame, teamGame, teamName }: { tournamentGame: Game; teamGame: Game; teamName: string }) {
	const tMeta = GAME_META[tournamentGame];
	const teamMeta = GAME_META[teamGame];
	return (
		<p className='text-sm text-muted-foreground'>
			Your team <span className='font-bold text-white'>{teamName}</span> plays {teamMeta.label}. This is a {tMeta.label} tournament.{' '}
			<Link href={`/teams?game=${tournamentGame.toLowerCase()}`} className='font-medium text-white underline underline-offset-4'>
				Create a {tMeta.short} team
			</Link>
			.
		</p>
	);
}
