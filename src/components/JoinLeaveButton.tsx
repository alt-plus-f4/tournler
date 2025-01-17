'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FaPlusCircle, FaMinusCircle, FaInfo } from 'react-icons/fa';
import { useToast } from '@/lib/hooks/use-toast';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
	DialogHeader,
	DialogFooter,
} from '@/components/ui/dialog';
import { revalidateTournamentPage } from '@/lib/actions';

interface JoinLeaveButtonProps {
	tournament: any;
	team: any;
	timeLeftToJoin: number;
}

export function JoinLeaveButton({
	tournament,
	team,
	timeLeftToJoin,
}: JoinLeaveButtonProps) {
	const { toast } = useToast();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isInTournament, setIsInTournament] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function checkIfInTournament() {
			const response = await fetch(
				`/api/tournaments/${tournament.id}/teams?teamId=${team.cs2TeamId}`
			);
			if (response.ok) {
				const data = await response.json();
				console.log(data.teamInTournament);
				if (data.teamInTournament) {
					setIsInTournament(true);
				}
			}
			setLoading(false);
		}
		checkIfInTournament();
	}, [tournament.id, team.id]);

	const handleJoinClick = () => {
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
	};

	async function joinTournament() {
		const response = await fetch(
			`/api/tournaments/${tournament.id}/teams`,
			{
				method: 'POST',
				body: JSON.stringify({ teamId: team.cs2TeamId }),
			}
		);

		setIsDialogOpen(false);

		if (response.ok) {
			toast({
				variant: 'default',
				title: 'Successfully joined the tournament',
			});
			setIsInTournament(true);
			await revalidateTournamentPage(tournament.id);
			return;
		}

		const json = await response.json();
		toast({
			variant: 'destructive',
			title: json.message || 'Error',
			description: "Couldn't join the tournament",
		});
	}

	async function leaveTournament() {
		const response = await fetch(
			`/api/tournaments/${tournament.id}/teams`,
			{
				method: 'DELETE',
				body: JSON.stringify({ teamId: team.cs2TeamId }),
			}
		);
		setIsDialogOpen(false);

		if (response.ok) {
			toast({
				variant: 'default',
				title: 'Successfully left the tournament',
			});
			setIsInTournament(false);
			await revalidateTournamentPage(tournament.id);
			return;
		}

		const json = await response.json();
		toast({
			variant: 'destructive',
			title: json.message || 'Error',
			description: "Couldn't leave the tournament",
		});
	}

	const isCaptain = team.capitan === team.userId;
	const hasStarted = new Date(tournament.startDate) <= new Date();
	const registrationClosed = timeLeftToJoin <= 0;

	return (
		<>
			<div className='absolute top-[-5px]'>
				{loading ? (
					<></>
				) : (
					isInTournament && (
						<>
							<div className='flex flex-row items-center text-white bg-black text-sm p-2 rounded-md font-extralight'>
								<FaInfo className='mr-1' />
								You are currently in the tournament.
							</div>
						</>
					)
				)}
			</div>

			<Button
				variant='default'
				className='p-4'
				onClick={handleJoinClick}
				disabled={
					!isCaptain || hasStarted || registrationClosed || loading
				}
			>
				{loading ? (
					<span>Loading...</span>
				) : isInTournament ? (
					<>
						<FaMinusCircle />
						<span className='hidden sm:block'>
							Leave Tournament
						</span>
					</>
				) : (
					<>
						<FaPlusCircle />
						<span className='hidden sm:block'>Join Tournament</span>
					</>
				)}
			</Button>

			<Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
				<DialogContent className='sm:max-w-[375px]'>
					<DialogHeader className='flex items-center pt-3'>
						<DialogTitle>
							{isInTournament
								? 'Leave Tournament Confirmation'
								: 'Join Tournament Confirmation'}
						</DialogTitle>
						<DialogDescription>
							{isInTournament
								? `You are about to leave the tournament "${tournament.name}" with your team "${team.name}".`
								: `You are about to join the tournament "${tournament.name}" with your team "${team.name}".`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex justify-center gap-2 pt-2'>
						<DialogClose asChild>
							<Button className='w-[40%]' variant='secondary'>
								Cancel
							</Button>
						</DialogClose>
						<Button
							className='w-[40%]'
							onClick={
								isInTournament
									? leaveTournament
									: joinTournament
							}
						>
							{isInTournament ? 'Leave' : 'Join'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
