'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { SimulateTournamentButton } from '@/components/SimulateTournamentButton';
import { DeleteSimulatedTournamentsButton } from '@/components/DeleteSimulatedTournamentsButton';
import { TournamentTable } from '@/components/TournamentTable';
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
import { useLatched } from '@/lib/hooks/use-latched';

// The create wizard and the edit dialog (forms, uploads, zod) are only fetched on first open.
const TournamentForm = dynamic(() => import('@/components/TournamentForm').then((m) => m.TournamentForm), { loading: () => <Button disabled>Create tournament</Button> });
const EditTournamentDialog = dynamic(() => import('@/components/EditTournamentDialog'));
import { Tournament } from '@/types/types';
import { cn } from '@/lib/utils';

const TOURNAMENTS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_FILTERS = [
	{ value: '', label: 'All' },
	{ value: 'UPCOMING', label: 'Upcoming' },
	{ value: 'ONGOING', label: 'Ongoing' },
	{ value: 'COMPLETED', label: 'Completed' },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

export default function TournamentsClient({ openCreate = false }: { openCreate?: boolean }) {
	const router = useRouter();
	const pathname = usePathname();
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const editMounted = useLatched(isEditDialogOpen);
	// ?create=1 mounts (and opens) the wizard right away; otherwise the first click does.
	const [createMounted, setCreateMounted] = useState(openCreate);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState<StatusFilter>('');
	const [devTool, setDevTool] = useState<'simulate' | 'delete' | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const { toast } = useToast();

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(searchInput);
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	useEffect(() => {
		let cancelled = false;
		async function fetchTournaments() {
			setIsLoading(true);
			const params = new URLSearchParams({ page: String(page), limit: String(TOURNAMENTS_PER_PAGE) });
			if (search) params.set('search', search);
			if (status) params.set('status', status);

			const response = await fetch(`/api/tournaments?${params.toString()}`);
			const data = await response.json();
			if (cancelled) return;
			if (Array.isArray(data)) {
				setTournaments(data);
				// The count endpoint ignores `status`, so with a filter active we infer
				// whether another page exists from whether this page came back full.
				if (status) setTotalPages(data.length < TOURNAMENTS_PER_PAGE ? page : page + 1);
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
			if (!cancelled) setTotalPages(count);
		}
		if (!status) fetchTournamentCount();
		fetchTournaments();
		return () => {
			cancelled = true;
		};
	}, [page, search, status, reloadKey]);

	const handleSubmit = async (formData: FormData) => {
		const response = await fetch('/api/tournaments', {
			method: 'POST',
			body: formData,
		});
		if (response.ok) {
			const newTournament = await response.json();
			toast({ title: 'Tournament created', description: `${newTournament.name} is upcoming.` });
			setReloadKey((k) => k + 1);
			return true;
		}
		const payload = await response.json().catch(() => null);
		toast({
			title: 'Could not create tournament',
			description: payload?.error ?? 'Something went wrong. Check the fields and try again.',
			variant: 'destructive',
		});
		return false;
	};

	const handleCreateOpenChange = (open: boolean) => {
		// Drop ?create=1 once the dialog closes so a refresh doesn't reopen it.
		if (!open && openCreate) router.replace(pathname);
	};

	const handleSave = (updatedTournament: Tournament) => {
		setTournaments(tournaments.map((t) => (t.id === updatedTournament.id ? updatedTournament : t)));
	};

	const handleDelete = (tournamentId: number) => {
		setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
	};

	const filterLabel = STATUS_FILTERS.find((f) => f.value === status)?.label.toLowerCase();

	return (
		<div className='mx-4 mt-12 max-w-6xl md:mx-12'>
			<div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
				<h1 className='text-2xl font-bold'>Tournaments</h1>
				<div className='flex items-center gap-3'>
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' className='text-muted-foreground'>
								Dev tools <ChevronDown aria-hidden />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuLabel className='text-xs text-muted-foreground'>Test data</DropdownMenuLabel>
							<DropdownMenuItem onSelect={() => setDevTool('simulate')}>Simulate tournament…</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => setDevTool('delete')} className='text-signal-live focus:text-signal-live'>
								Delete simulated tournaments…
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<span aria-hidden className='h-6 w-px bg-border' />
					{createMounted ? <TournamentForm onSubmit={handleSubmit} defaultOpen onOpenChange={handleCreateOpenChange} /> : <Button onClick={() => setCreateMounted(true)}>Create tournament</Button>}
				</div>
			</div>

			<SimulateTournamentButton open={devTool === 'simulate'} onOpenChange={(o) => setDevTool(o ? 'simulate' : null)} />
			<DeleteSimulatedTournamentsButton
				open={devTool === 'delete'}
				onOpenChange={(o) => {
					setDevTool(o ? 'delete' : null);
					if (!o) setReloadKey((k) => k + 1);
				}}
			/>

			<div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-end'>
				<div className='flex-1 space-y-1.5'>
					<Label htmlFor='admin-tournament-search' className='sr-only'>
						Search tournaments
					</Label>
					<Input id='admin-tournament-search' type='search' placeholder='Search by tournament name…' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
				</div>
				<div role='group' aria-label='Filter by status' className='inline-flex h-10 rounded-md border border-border p-0.5'>
					{STATUS_FILTERS.map((f) => (
						<button
							key={f.label}
							type='button'
							aria-pressed={status === f.value}
							onClick={() => {
								setStatus(f.value);
								setPage(1);
							}}
							className={cn(
								'rounded-sm px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								status === f.value ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
							)}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			<TournamentTable
				isLoading={isLoading && !hasLoadedOnce}
				tournaments={tournaments}
				emptyMessage={search || status ? `No ${status ? `${filterLabel} ` : ''}tournaments match${search ? ` “${search}”` : ''}.` : 'No tournaments yet. Create one to get started.'}
				onEdit={(tournament) => {
					setEditingTournament(tournament);
					setIsEditDialogOpen(true);
				}}
			/>
			<Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} />
			{editMounted && <EditTournamentDialog tournament={editingTournament} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />}
		</div>
	);
}
