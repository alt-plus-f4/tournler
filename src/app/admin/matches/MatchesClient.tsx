'use client';

import { useState, useEffect } from 'react';
import { MatchTable } from '@/components/MatchTable';
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Match } from '@/types/types';
import EditMatchDialog from '@/components/EditMatchDialog';
import CreateMatchDialog from '@/components/CreateMatchDialog';

const MATCHES_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function MatchesClient() {
	const [matches, setMatches] = useState<Match[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [editingMatch, setEditingMatch] = useState<Match | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	useEffect(() => {
		async function fetchMatches() {
			setIsLoading(true);
			const params = new URLSearchParams({ page: String(page), limit: String(MATCHES_PER_PAGE) });
			if (search) params.set('search', search);

			const response = await fetch(`/api/matches?${params.toString()}`);
			const data = await response.json();
			if (Array.isArray(data.matches)) {
				setMatches(data.matches);
				setTotalPages(data.totalPages ?? 1);
			} else {
				console.error('API response is not an array:', data.matches);
			}
			setIsLoading(false);
			setHasLoadedOnce(true);
		}
		fetchMatches();
	}, [page, search]);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handleSave = (updatedMatch: Match) => {
		setMatches(matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)));
	};

	const handleCreate = (newMatch: Match) => {
		setMatches((prev) => [newMatch, ...prev]);
	};

	return (
		<div className='mx-4 mt-12 max-w-6xl md:mx-12'>
			<div className='mb-6 flex items-center justify-between gap-3'>
				<h1 className='text-2xl font-bold'>Matches</h1>
				<Button onClick={() => setIsCreateDialogOpen(true)}>Create match</Button>
			</div>
			<Label htmlFor='admin-match-search' className='sr-only'>
				Search matches
			</Label>
			<Input id='admin-match-search' type='search' placeholder='Search by tournament or team name…' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className='mb-4' />
			<MatchTable
				isLoading={isLoading && !hasLoadedOnce}
				matches={matches}
				emptyMessage={search ? `No matches match “${search}”.` : 'No matches yet. Matches are created when a tournament starts.'}
				onEdit={(match) => {
					setEditingMatch(match);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination totalPages={totalPages} currentPage={page} onPageChange={handlePageChange} />
			<EditMatchDialog match={editingMatch} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} />
			<CreateMatchDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} onCreate={handleCreate} />
		</div>
	);
}
