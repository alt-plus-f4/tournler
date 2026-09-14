'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/lib/hooks/use-toast';
import { Match } from '@/types/types';

interface Option {
	id: number;
	name: string;
}

interface CreateMatchDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (match: Match) => void;
}

function defaultMatchDate() {
	const d = new Date(Date.now() + 60 * 60 * 1000);
	d.setSeconds(0, 0);
	return d.toISOString().slice(0, 16);
}

export default function CreateMatchDialog({ isOpen, onClose, onCreate }: CreateMatchDialogProps) {
	const [tournaments, setTournaments] = useState<Option[]>([]);
	const [teams, setTeams] = useState<Option[]>([]);
	const [tournamentId, setTournamentId] = useState('');
	const [teamAId, setTeamAId] = useState('');
	const [teamBId, setTeamBId] = useState('');
	const [matchDate, setMatchDate] = useState(defaultMatchDate());
	const [isPickup, setIsPickup] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (!isOpen) return;
		setTournamentId('');
		setTeamAId('');
		setTeamBId('');
		setMatchDate(defaultMatchDate());
		setIsPickup(false);

		fetch('/api/tournaments?limit=100')
			.then((r) => r.json())
			.then((data) => setTournaments(Array.isArray(data) ? data.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })) : []))
			.catch((e) => console.error('Failed to load tournaments', e));

		fetch('/api/teams?limit=100')
			.then((r) => r.json())
			.then((data) => setTeams(Array.isArray(data.teams) ? data.teams.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })) : []))
			.catch((e) => console.error('Failed to load teams', e));
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!matchDate) return;
		if (!isPickup) {
			if (!tournamentId || !teamAId || !teamBId) return;
			if (teamAId === teamBId) {
				toast({ variant: 'destructive', title: 'Team A and Team B must be different teams' });
				return;
			}
		}

		setIsSaving(true);
		try {
			const body = isPickup
				? { isPickup: true, matchDate: new Date(matchDate).toISOString() }
				: {
						tournamentId: Number(tournamentId),
						teamAId: Number(teamAId),
						teamBId: Number(teamBId),
						matchDate: new Date(matchDate).toISOString(),
					};

			const response = await fetch('/api/matches', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to create match');

			toast({ title: 'Match created' });
			onCreate(payload.match);
			onClose();
		} catch (error) {
			console.error('Failed to create match', error);
			toast({ variant: 'destructive', title: 'Could not create match', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[460px]'>
				<DialogHeader>
					<DialogTitle>Create Match</DialogTitle>
					<DialogDescription>Creates a standalone match for testing — it isn&apos;t wired into any tournament bracket.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-5'>
					<label htmlFor='create-match-pickup' className='flex items-start gap-3 rounded-lg border border-white/10 p-3 cursor-pointer'>
						<Checkbox id='create-match-pickup' checked={isPickup} onCheckedChange={(checked) => setIsPickup(checked === true)} className='mt-0.5' />
						<span className='text-sm'>
							Open pickup match
							<span className='block text-xs text-muted-foreground'>No tournament, no pre-formed teams — any signed-in player can join Side A or Side B directly.</span>
						</span>
					</label>

					{!isPickup && (
						<>
							<div className='space-y-2'>
								<Label htmlFor='create-match-tournament'>Tournament</Label>
								<Select value={tournamentId} onValueChange={setTournamentId}>
									<SelectTrigger id='create-match-tournament'>
										<SelectValue placeholder='Select a tournament' />
									</SelectTrigger>
									<SelectContent>
										{tournaments.map((t) => (
											<SelectItem key={t.id} value={String(t.id)}>
												{t.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-2'>
									<Label htmlFor='create-match-team-a'>Team A</Label>
									<Select value={teamAId} onValueChange={setTeamAId}>
										<SelectTrigger id='create-match-team-a'>
											<SelectValue placeholder='Select a team' />
										</SelectTrigger>
										<SelectContent>
											{teams.map((t) => (
												<SelectItem key={t.id} value={String(t.id)}>
													{t.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='create-match-team-b'>Team B</Label>
									<Select value={teamBId} onValueChange={setTeamBId}>
										<SelectTrigger id='create-match-team-b'>
											<SelectValue placeholder='Select a team' />
										</SelectTrigger>
										<SelectContent>
											{teams.map((t) => (
												<SelectItem key={t.id} value={String(t.id)}>
													{t.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</>
					)}

					<div className='space-y-2'>
						<Label htmlFor='create-match-date'>Match Date</Label>
						<Input id='create-match-date' type='datetime-local' value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
					</div>

					<DialogFooter className='gap-2 pt-2'>
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving || !matchDate || (!isPickup && (!tournamentId || !teamAId || !teamBId))}>
							{isSaving ? 'Creating...' : 'Create Match'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
