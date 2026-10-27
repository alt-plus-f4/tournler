'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/Pagination';
import { MatchList, type MatchListItem } from './MatchList';
import { STATUS_TABS, type StatusFilter } from './status';

interface MatchesBrowserProps {
	status: StatusFilter;
	tournamentId: string;
	page: number;
	totalPages: number;
	tournaments: { id: number; name: string }[];
	matches: MatchListItem[];
	/** The current ?game= filter (see the /matches page) — preserved across status/tournament/page navigation. */
	game: 'CS2' | 'LOL' | null;
}

/**
 * Filters, list and pagination for /matches. The data is server-rendered from the URL
 * (?status=&tournament=&page=); changing a filter pushes a new URL inside a transition, so the
 * current list stays up (dimmed) until the server's new list arrives.
 */
export function MatchesBrowser({ status, tournamentId, page, totalPages, tournaments, matches, game }: MatchesBrowserProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();
	// Live matches among the ones on screen; the status filter itself is applied on the server.
	const liveCount = matches.filter((m) => m.status === 'LIVE').length;

	const navigate = (next: { status?: StatusFilter; tournamentId?: string; page?: number }) => {
		const s = next.status ?? status;
		const t = next.tournamentId ?? tournamentId;
		// Changing a filter starts over at page 1, as before.
		const p = next.page ?? 1;
		const params = new URLSearchParams();
		if (s !== 'ALL') params.set('status', s.toLowerCase());
		if (t) params.set('tournament', t);
		if (p > 1) params.set('page', String(p));
		if (game) params.set('game', game.toLowerCase());
		const query = params.toString();
		startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
	};

	return (
		<>
			<div className='mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div role='group' aria-label='Filter by status' className='inline-flex w-full rounded-md border border-border bg-card/60 p-[3px] sm:w-auto'>
					{STATUS_TABS.map((tab) => {
						const active = status === tab.value;
						return (
							<button
								key={tab.value}
								type='button'
								aria-pressed={active}
								onClick={() => navigate({ status: tab.value })}
								className={cn(
									'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none',
									active ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white',
								)}
							>
								{tab.label}
								{tab.value === 'LIVE' && liveCount > 0 && (
									<span className='font-mono text-xs tabular-nums text-signal-live'>
										<span className='sr-only'>, </span>
										{liveCount}
									</span>
								)}
							</button>
						);
					})}
				</div>
				<Select value={tournamentId || 'ALL'} onValueChange={(value) => navigate({ tournamentId: value === 'ALL' ? '' : value })}>
					<SelectTrigger className='w-full sm:w-60' aria-label='Filter by tournament'>
						<SelectValue placeholder='All tournaments' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='ALL'>All tournaments</SelectItem>
						{tournaments.map((t) => (
							<SelectItem key={t.id} value={String(t.id)}>
								{t.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div aria-busy={isPending} className={`transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
				{matches.length === 0 ? (
					<div className='mt-4 rounded-md border border-dashed border-border px-4 py-24 text-center'>
						<p className='font-black uppercase tracking-wide'>No matches found</p>
						<p className='mt-1 text-sm text-muted-foreground'>
							{status !== 'ALL' || tournamentId ? 'Nothing matches these filters. Try All, or pick another tournament.' : 'Matches appear here once a tournament starts or a pickup is created.'}
						</p>
					</div>
				) : (
					<MatchList matches={matches} />
				)}
			</div>

			<Pagination totalPages={totalPages} currentPage={page} onPageChange={(p) => navigate({ page: p })} />
		</>
	);
}
