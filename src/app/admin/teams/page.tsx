'use client';

import { useState, useEffect } from 'react';
import { TeamTable } from '@/components/TeamTable';
import { Pagination } from '@/components/Pagination';
import { FaExclamation } from 'react-icons/fa';
import { Cs2Team } from '@/types/types';
import EditTeamDialog from '@/components/EditTeamDialog';

const TEAMS_PER_PAGE = 10;

export default function AdminTeamsPage() {
	const [teams, setTeams] = useState<Cs2Team[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	useEffect(() => {
		async function fetchTeams() {
			const response = await fetch(
				`/api/teams?page=${page}&limit=${TEAMS_PER_PAGE}`
			);

			const data = await response.json();

			if (Array.isArray(data.teams)) {
				setTeams(data.teams);
			} else {
				console.error('API response is not an array:', data.teams);
			}
		}
		async function fetchTeamCount() {
			const response = await fetch('/api/teams/count');
			const count = await response.json();
			setTotalPages(count);
		}
		fetchTeamCount();
		fetchTeams();
	}, [page]);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSave = (updatedTeam: Cs2Team) => {
		setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
	};

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<h1 className='text-2xl font-bold mb-4'>Team Management</h1>
			<div className='w-full border p-2 mb-4 rounded-sm flex items-center'>
				<FaExclamation className='text-red-500 mr-2' />
				<p className='text-md border-b border-red-500'>
					Click on a row to edit Team.
				</p>
			</div>
			<TeamTable
				isLoading={!teams.length}
				teams={teams}
				onEdit={(team) => {
					setEditingTeam(team);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination
				totalPages={totalPages}
				currentPage={page}
				onPageChange={handlePageChange}
			/>
			<EditTeamDialog
				team={editingTeam}
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				onSave={handleSave}
			/>
		</div>
	);
}
