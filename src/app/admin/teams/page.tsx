'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { TeamForm } from '@/components/TeamForm';
import { TeamTable } from '@/components/TeamTable';
import { Pagination } from '@/components/Pagination';
import EditTeamDialog from '@/components/EditTeamDialog';
import { FaExclamation } from 'react-icons/fa';
import { Cs2Team } from '@/types/types';

const TEAMS_PER_PAGE = 10;

export default function AdminTeamsPage() {
	const [teams, setTeams] = useState<Cs2Team[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		async function fetchTeams() {
			const response = await fetch(
				`/api/teams?page=${page}&limit=${TEAMS_PER_PAGE}`
			);
			const data = await response.json();
			if (Array.isArray(data)) {
				setTeams(data);
			} else {
				console.error('API response is not an array:', data);
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

	const handleSubmit = async (formData: FormData) => {
		const response = await fetch('/api/teams', {
			method: 'POST',
			body: formData,
		});
		if (response.ok) {
			toast({
				title: 'Success',
				description: 'Team created successfully',
				variant: 'default',
			});
			const newTeam = await response.json();
			setTeams((prevTeams) => [...prevTeams, newTeam]);
		} else {
			toast({
				title: 'Error',
				description: 'Failed to create team',
				variant: 'destructive',
			});
		}
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSave = (updatedTeam: Cs2Team) => {
		setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
	};

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<div className='flex flex-row justify-between mb-4'>
				<h1 className='text-2xl font-bold mb-4'>Teams</h1>
				<TeamForm onSubmit={handleSubmit} />
			</div>
			<div className='w-full border p-2 mb-4 rounded-sm flex flex-row items-center'>
				<FaExclamation className='mt-[3px] w-4 h-4 text-2xl text-red-500 mr-2' />
				<p className='text-md border-b border-b-red-500'>
					Click on a row to edit Teams.
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
