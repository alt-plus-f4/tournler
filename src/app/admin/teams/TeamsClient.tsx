'use client';

import { useState, useEffect } from 'react';
import { TeamTable } from '@/components/TeamTable';
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import { FaExclamation } from 'react-icons/fa';
import { Cs2Team } from '@/types/types';
import EditTeamDialog from '@/components/EditTeamDialog';

const TEAMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function TeamsClient() {
	const [teams, setTeams] = useState<Cs2Team[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	useEffect(() => {
		async function fetchTeams() {
			setIsLoading(true);
			const params = new URLSearchParams({ page: String(page), limit: String(TEAMS_PER_PAGE) });
			if (search) params.set('search', search);

			const response = await fetch(`/api/teams?${params.toString()}`);
			const data = await response.json();

			if (Array.isArray(data.teams)) {
				setTeams(data.teams);
			} else {
				console.error('API response is not an array:', data.teams);
			}
			setIsLoading(false);
			setHasLoadedOnce(true);
		}
		async function fetchTeamCount() {
			const params = new URLSearchParams({ limit: String(TEAMS_PER_PAGE) });
			if (search) params.set('search', search);
			const response = await fetch(`/api/teams/count?${params.toString()}`);
			const count = await response.json();
			setTotalPages(count);
		}
		fetchTeamCount();
		fetchTeams();
	}, [page, search]);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSave = (updatedTeam: Cs2Team) => {
		setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
	};

	const handleDelete = (teamId: number) => {
		setTeams((prev) => prev.filter((t) => t.id !== teamId));
	};

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<h1 className='text-2xl font-bold mb-4'>Team Management</h1>
			<div className='w-full border p-2 mb-4 rounded-sm flex items-center'>
				<FaExclamation className='text-red-500 mr-2' />
				<p className='text-md border-b border-red-500'>Click on a row (or press Enter) to edit a team.</p>
			</div>
			<Input placeholder='Search by team name...' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className='mb-4' />
			<TeamTable isLoading={isLoading && !hasLoadedOnce} teams={teams} onEdit={(team) => {
				setEditingTeam(team);
				setIsEditDialogOpen(true);
			}} />
			<Pagination totalPages={totalPages} currentPage={page} onPageChange={handlePageChange} />
			<EditTeamDialog team={editingTeam} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />
		</div>
	);
}
