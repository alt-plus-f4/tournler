'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FORMAT_OPTIONS = [
	{ value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
	{ value: 'ROUND_ROBIN', label: 'Round Robin' },
	{ value: 'DOUBLE_ELIMINATION', label: 'Double Elimination' },
];

export function SimulateTournamentButton() {
	const router = useRouter();
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);
	const [isSimulating, setIsSimulating] = useState(false);
	const [teamCount, setTeamCount] = useState(8);
	const [format, setFormat] = useState('SINGLE_ELIMINATION');

	const handleSimulate = async () => {
		setIsSimulating(true);

		try {
			const response = await fetch('/api/tournaments/simulate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ teamCount, format }),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to simulate tournament');
			}

			toast({
				title: 'Tournament simulated',
				description: `${payload.teamsCreated} teams, ${payload.matchesPlayed} matches played. Opening it now.`,
			});
			setIsOpen(false);
			router.push(`/tournaments/${payload.tournament.id}`);
		} catch (error) {
			console.error('Failed to simulate tournament', error);
			toast({
				variant: 'destructive',
				title: 'Could not simulate tournament',
				description: error instanceof Error ? error.message : 'An unexpected error occurred',
			});
		} finally {
			setIsSimulating(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' className='border-white/20 bg-black text-white hover:bg-white hover:text-black'>
					Simulate Tournament
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Simulate Tournament</DialogTitle>
					<DialogDescription>Generates fake teams, starts a tournament in the chosen format, and auto-plays every match with random results.</DialogDescription>
				</DialogHeader>
				<div className='space-y-2'>
					<Label htmlFor='sim-team-count'>Number of Teams</Label>
					<Input id='sim-team-count' type='number' min={2} max={64} value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} />

					<Label htmlFor='sim-format'>Bracket Format</Label>
					<Select value={format} onValueChange={setFormat}>
						<SelectTrigger id='sim-format'>
							<SelectValue placeholder='Select a format' />
						</SelectTrigger>
						<SelectContent>
							{FORMAT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button className='w-full mt-3' onClick={handleSimulate} disabled={isSimulating}>
						{isSimulating ? 'Simulating...' : 'Simulate'}
					</Button>
				</div>
				<DialogClose asChild>
					<Button variant='outline'>Close</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
