'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { TournamentForm } from '@/components/TournamentForm';
import { SimulateTournamentButton } from '@/components/SimulateTournamentButton';
import { DeleteSimulatedTournamentsButton } from '@/components/DeleteSimulatedTournamentsButton';
import { TournamentTable } from '@/components/TournamentTable';
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import EditTournamentDialog from '@/components/EditTournamentDialog';
import { FaExclamation } from 'react-icons/fa';
import { Tournament } from '@/types/types';

const TOURNAMENTS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function TournamentsClient() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const { toast } = useToast();

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	useEffect(() => {
		async function fetchTournaments() {
			setIsLoading(true);
			const params = new URLSearchParams({ page: String(page), limit: String(TOURNAMENTS_PER_PAGE) });
			if (search) params.set('search', search);

			const response = await fetch(`/api/tournaments?${params.toString()}`);
			const data = await response.json();
			if (Array.isArray(data)) {
				setTournaments(data);
			} else {
				console.error('API response is not an array:', data);
			}
			setIsLoading(false);
			setHasLoadedOnce(true);
		}
		async function fetchTournamentCount() {
			const params = new URLSearchParams({ limit: String(TOURNAMENTS_PER_PAGE) });
			if (search) params.set('search', search);
			const response = await fetch(`/api/tournaments/count?${params.toString()}`);
			const count = await response.json();
			setTotalPages(count);
		}
		fetchTournamentCount();
		fetchTournaments();
	}, [page, search]);

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
			setTournaments((prevTournaments) => [...prevTournaments, newTournament]);
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
		setTournaments(tournaments.map((t) => (t.id === updatedTournament.id ? updatedTournament : t)));
	};

	const handleDelete = (tournamentId: number) => {
		setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
	};

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<div className='flex flex-row justify-between mb-4'>
				<h1 className='text-2xl font-bold mb-4'>Tournaments</h1>
				<div className='flex gap-2'>
					<SimulateTournamentButton />
					<DeleteSimulatedTournamentsButton />
					<TournamentForm onSubmit={handleSubmit} />
				</div>
			</div>
			<div className='w-full border p-2 mb-4 rounded-sm flex flex-row items-center'>
				<FaExclamation className='mt-[3px] w-4 h-4 text-2xl text-red-500 mr-2' />
				<p className='text-md border-b border-b-red-500'>Click on a row (or press Enter) to edit a tournament.</p>
			</div>
			<Input placeholder='Search by tournament name...' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className='mb-4' />
			<TournamentTable
				isLoading={isLoading && !hasLoadedOnce}
				tournaments={tournaments}
				onEdit={(tournament) => {
					setEditingTournament(tournament);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination totalPages={totalPages} currentPage={page} onPageChange={handlePageChange} />
			<EditTournamentDialog tournament={editingTournament} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />
		</div>
	);
}
