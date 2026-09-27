'use client';

import { useState, useEffect } from 'react';
import { TeamTable } from '@/components/TeamTable';
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cs2Team } from '@/types/types';
import dynamic from 'next/dynamic';
import { useLatched } from '@/lib/hooks/use-latched';
import type { Game } from '@prisma/client';
import { GameGlyph } from '@/components/games/GameMark';
import { GAME_META, GAMES, gameParam } from '@/lib/games';
import { cn } from '@/lib/utils';

// Only fetched once an admin first opens a team.
const EditTeamDialog = dynamic(() => import('@/components/EditTeamDialog'));

const TEAMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function TeamsClient() {
	const [teams, setTeams] = useState<Cs2Team[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingTeam, setEditingTeam] = useState<Cs2Team | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const editMounted = useLatched(isEditDialogOpen);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [game, setGame] = useState<Game | null>(null);

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
			if (game) params.set('game', gameParam(game));

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
			if (game) params.set('game', gameParam(game));
			const response = await fetch(`/api/teams/count?${params.toString()}`);
			const count = await response.json();
			setTotalPages(count);
		}
		fetchTeamCount();
		fetchTeams();
	}, [page, search, game]);

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
		<div className='mx-4 mt-12 max-w-6xl md:mx-12'>
			<h1 className='mb-6 text-2xl font-bold'>Teams</h1>
			<Label htmlFor='admin-team-search' className='sr-only'>
				Search teams
			</Label>
			<div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center'>
				<Input id='admin-team-search' type='search' placeholder='Search by team name…' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className='sm:max-w-sm' />
				<div role='group' aria-label='Filter by game' className='flex flex-wrap gap-2'>
					{([null, ...GAMES] as (Game | null)[]).map((g) => {
						const active = g === game;
						return (
							<button
								key={g ?? 'all'}
								type='button'
								aria-pressed={active}
								onClick={() => {
									setGame(g);
									setPage(1);
								}}
								className={cn(
									'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
									active ? 'border-white bg-white/10 text-white' : 'border-border text-neutral-300 hover:border-neutral-500 hover:text-white',
								)}
							>
								{g && <GameGlyph game={g} className='h-3.5 w-3.5' />}
								{g ? GAME_META[g].short : 'All'}
							</button>
						);
					})}
				</div>
			</div>
			<TeamTable
				isLoading={isLoading && !hasLoadedOnce}
				teams={teams}
				emptyMessage={search ? `No ${game ? GAME_META[game].short + ' ' : ''}teams match “${search}”.` : game ? `No ${GAME_META[game].label} teams yet.` : 'No teams yet.'}
				onEdit={(team) => {
					setEditingTeam(team);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination totalPages={totalPages} currentPage={page} onPageChange={handlePageChange} />
			{editMounted && <EditTeamDialog team={editingTeam} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />}
		</div>
	);
}
