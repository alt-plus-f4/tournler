'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { revalidateTournamentPage } from '@/lib/actions';

interface JoinLeaveButtonProps {
	tournament: {
		id: number;
		name: string;
		startDate: string;
	};
	team: {
		id: number;
		name: string;
	} | null;
	timeLeftToJoin: number;
	/** Every slot is taken — a registered team can still leave, nobody else can join. */
	isFull?: boolean;
}

export function JoinLeaveButton({ tournament, team, timeLeftToJoin, isFull = false }: JoinLeaveButtonProps) {
	const { toast } = useToast();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isInTournament, setIsInTournament] = useState(false);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		async function checkIfInTournament() {
			if (!team) {
				setLoading(false);
				return;
			}
			try {
				const response = await fetch(`/api/tournaments/${tournament.id}/teams?teamId=${team.id}`);
				if (response.ok) {
					const data = await response.json();
					setIsInTournament(!!data.teamInTournament);
				}
			} finally {
				setLoading(false);
			}
		}

		void checkIfInTournament();
	}, [tournament.id, team]);

	async function submit(method: 'POST' | 'DELETE') {
		if (!team) return;
		setSubmitting(true);
		try {
			const response = await fetch(`/api/tournaments/${tournament.id}/teams`, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ teamId: team.id }),
			});

			if (response.ok) {
				setIsDialogOpen(false);
				toast({ title: method === 'POST' ? `${team.name} is registered` : `${team.name} left the tournament` });
				setIsInTournament(method === 'POST');
				await revalidateTournamentPage(tournament.id);
				return;
			}

			const json = await response.json().catch(() => null);
			toast({
				variant: 'destructive',
				title: method === 'POST' ? "Couldn't register your team" : "Couldn't leave the tournament",
				description: json?.error || json?.message || 'Please try again.',
			});
		} finally {
			setSubmitting(false);
		}
	}

	if (!team) return null;

	const hasStarted = new Date(tournament.startDate) <= new Date();
	const registrationClosed = hasStarted || timeLeftToJoin <= 0;
	const blockedByCapacity = isFull && !isInTournament;

	return (
		<div className='flex flex-col items-start gap-2 sm:items-end'>
			{!loading && (
				<p className='text-sm text-muted-foreground' aria-live='polite'>
					{isInTournament ? (
						<>
							<span className='font-bold text-white'>{team.name}</span> is registered.
						</>
					) : blockedByCapacity ? (
						'Every slot is taken.'
					) : (
						<>
							Register as <span className='font-bold text-white'>{team.name}</span>.
						</>
					)}
				</p>
			)}

			<Button variant={isInTournament ? 'outline' : 'default'} onClick={() => setIsDialogOpen(true)} disabled={registrationClosed || loading || blockedByCapacity}>
				{loading ? (
					'Checking registration…'
				) : isInTournament ? (
					<>
						<LogOut className='h-4 w-4' aria-hidden />
						Leave tournament
					</>
				) : (
					<>
						<LogIn className='h-4 w-4' aria-hidden />
						Register team
					</>
				)}
			</Button>

			<Dialog open={isDialogOpen} onOpenChange={(open) => !submitting && setIsDialogOpen(open)}>
				<DialogContent className='sm:max-w-sm'>
					<DialogHeader>
						<DialogTitle>{isInTournament ? 'Leave this tournament?' : 'Register your team?'}</DialogTitle>
						<DialogDescription>
							{isInTournament ? `${team.name} will be removed from ${tournament.name}. You can register again while slots are open.` : `${team.name} will be registered for ${tournament.name}.`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0'>
						<DialogClose asChild>
							<Button variant='outline' disabled={submitting}>
								Cancel
							</Button>
						</DialogClose>
						<Button variant={isInTournament ? 'destructive' : 'default'} onClick={() => submit(isInTournament ? 'DELETE' : 'POST')} disabled={submitting} isLoading={submitting}>
							{isInTournament ? 'Leave' : 'Register'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
