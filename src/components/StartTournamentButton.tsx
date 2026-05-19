'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';

interface StartTournamentButtonProps {
	tournamentId: number;
	tournamentName: string;
}

export function StartTournamentButton({ tournamentId, tournamentName }: StartTournamentButtonProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isStarting, setIsStarting] = useState(false);

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

			toast({
				title: 'Tournament started',
				description: `${tournamentName} is now live.`,
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
		<Button variant='outline' className='border-white/20 bg-black text-white hover:bg-white hover:text-black' onClick={handleStartTournament} disabled={isStarting}>
			{isStarting ? 'Starting...' : 'Start Tournament'}
		</Button>
	);
}