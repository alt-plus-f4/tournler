'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { TournamentForm } from '@/components/TournamentForm';
import { TournamentTable } from '@/components/TournamentTable';
import { Pagination } from '@/components/Pagination';
import EditTournamentDialog from '@/components/EditTournamentDialog';
import { FaExclamation } from 'react-icons/fa';

const TOURNAMENTS_PER_PAGE = 10;

export interface Tournament {
	id: number;
	name: string;
	prizePool: number;
	teamCapacity: number;
	location: string;
	startDate: string;
	endDate: string;
	bannerUrl: string;
	logoUrl: string;
	status: number;
	type: number;
}

export default function AdminTournamentsPage() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingTournament, setEditingTournament] =
		useState<Tournament | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		async function fetchTournaments() {
			const response = await fetch(
				`/api/tournaments?page=${page}&limit=${TOURNAMENTS_PER_PAGE}`
			);
			const data = await response.json();
			if (Array.isArray(data)) {
				setTournaments(data);
			} else {
				console.error('API response is not an array:', data);
			}
		}
		async function fetchTournamentCount() {
			const response = await fetch('/api/tournaments/count');
			const count = await response.json();
			console.log(count);
			setTotalPages(count);
		}
		fetchTournamentCount();
		fetchTournaments();
	}, [page]);

	const handleSubmit = async (formData: FormData) => {
		const response = await fetch('/api/tournaments', {
			method: 'POST',
			body: formData,
		});
		if (response.ok) {
			toast({
				title: 'Success',
				description: 'Tournament created successfully',
				variant: 'default',
			});
			const newTournament = await response.json();
			setTournaments((prevTournaments) => [
				...prevTournaments,
				newTournament,
			]);
		} else {
			toast({
				title: 'Error',
				description: 'Failed to create tournament',
				variant: 'destructive',
			});
		}
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSave = (updatedTournament: Tournament) => {
		setTournaments(
			tournaments.map((t) =>
				t.id === updatedTournament.id ? updatedTournament : t
			)
		);
	};

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<div className='flex flex-row justify-between mb-4'>
				<h1 className='text-2xl font-bold mb-4'>Tournaments</h1>
				<TournamentForm onSubmit={handleSubmit} />
			</div>
			<div className='w-full border p-2 mb-4 rounded-sm flex flex-row items-center'>
				<FaExclamation className='mt-[3px] w-4 h-4 text-2xl text-red-500 mr-2' />
				<p className='text-md border-b border-b-red-500'>
					Click on a row to edit Tournaments.
				</p>
			</div>
			<TournamentTable
				isLoading={!tournaments.length}
				tournaments={tournaments}
				onEdit={(tournament) => {
					setEditingTournament(tournament);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination
				totalPages={totalPages}
				currentPage={page}
				onPageChange={handlePageChange}
			/>
			<EditTournamentDialog
				tournament={editingTournament}
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				onSave={handleSave}
			/>
		</div>
	);
}
