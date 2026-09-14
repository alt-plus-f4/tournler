'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/use-toast';
import { Match } from '@/types/types';

interface EditMatchDialogProps {
	match: Match | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updatedMatch: Match) => void;
}

export default function EditMatchDialog({ match, isOpen, onClose, onSave }: EditMatchDialogProps) {
	const [scoreTeamA, setScoreTeamA] = useState('');
	const [scoreTeamB, setScoreTeamB] = useState('');
	const [winnerId, setWinnerId] = useState('');
	const [matchDate, setMatchDate] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (match) {
			setScoreTeamA(match.scoreTeamA?.toString() ?? '');
			setScoreTeamB(match.scoreTeamB?.toString() ?? '');
			setWinnerId(match.winnerId?.toString() ?? '');
			setMatchDate(match.matchDate ? new Date(match.matchDate).toISOString().slice(0, 16) : '');
		}
	}, [match]);

	if (!match) return null;

	const canEditResult = match.teamA !== null && match.teamB !== null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const body: Record<string, unknown> = { matchDate: new Date(matchDate).toISOString() };
			if (canEditResult) {
				if (scoreTeamA !== '') body.scoreTeamA = Number(scoreTeamA);
				if (scoreTeamB !== '') body.scoreTeamB = Number(scoreTeamB);
				if (winnerId !== '') body.winnerId = Number(winnerId);
			}

			const response = await fetch(`/api/matches/${match.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to update match');

			toast({ title: 'Match updated' });
			onSave(payload.match);
			onClose();
		} catch (error) {
			console.error('Failed to update match', error);
			toast({ variant: 'destructive', title: 'Could not update match', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[460px]'>
				<DialogHeader>
					<DialogTitle>Edit Match</DialogTitle>
					<DialogDescription>{match.tournament?.name}</DialogDescription>
				</DialogHeader>

				<div className='flex items-center justify-center gap-4 rounded-lg border border-white/10 py-4'>
					<span className='font-semibold'>{match.teamA?.name ?? 'TBD'}</span>
					<span className='text-muted-foreground text-sm'>vs</span>
					<span className='font-semibold'>{match.teamB?.name ?? 'TBD'}</span>
				</div>

				<form onSubmit={handleSubmit} className='space-y-5'>
					<div className='space-y-2'>
						<Label htmlFor='edit-match-date'>Match Date</Label>
						<Input id='edit-match-date' type='datetime-local' value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
					</div>

					{canEditResult ? (
						<div className='space-y-3'>
							<p className='text-xs uppercase tracking-wide text-muted-foreground'>Result</p>
							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-2'>
									<Label htmlFor='edit-score-a'>{match.teamA?.name} Score</Label>
									<Input id='edit-score-a' type='number' value={scoreTeamA} onChange={(e) => setScoreTeamA(e.target.value)} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='edit-score-b'>{match.teamB?.name} Score</Label>
									<Input id='edit-score-b' type='number' value={scoreTeamB} onChange={(e) => setScoreTeamB(e.target.value)} />
								</div>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-winner'>Winner</Label>
								<Select value={winnerId} onValueChange={setWinnerId}>
									<SelectTrigger id='edit-winner'>
										<SelectValue placeholder='Not decided yet' />
									</SelectTrigger>
									<SelectContent>
										{match.teamA && <SelectItem value={String(match.teamA.id)}>{match.teamA.name}</SelectItem>}
										{match.teamB && <SelectItem value={String(match.teamB.id)}>{match.teamB.name}</SelectItem>}
									</SelectContent>
								</Select>
							</div>
							{match.status === 'COMPLETED' && (
								<div className='flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs text-yellow-500/90'>
									<Badge variant='outline' className='border-yellow-500/40 text-yellow-500 shrink-0'>
										Completed
									</Badge>
									<span>Changing the winner to a different team will be rejected to protect bracket integrity.</span>
								</div>
							)}
						</div>
					) : (
						<p className='text-sm text-muted-foreground'>This match&apos;s teams aren&apos;t decided yet (waiting on a previous round) &mdash; only the date can be edited.</p>
					)}

					<DialogFooter className='gap-2 pt-2'>
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
