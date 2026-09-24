'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
}

/**
 * Filters, list and pagination for /matches. The data is server-rendered from the URL
 * (?status=&tournament=&page=); changing a filter pushes a new URL inside a transition, so the
 * current list stays up (dimmed) until the server's new list arrives.
 */
export function MatchesBrowser({ status, tournamentId, page, totalPages, tournaments, matches }: MatchesBrowserProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	const navigate = (next: { status?: StatusFilter; tournamentId?: string; page?: number }) => {
		const s = next.status ?? status;
		const t = next.tournamentId ?? tournamentId;
		// Changing a filter starts over at page 1, as before.
		const p = next.page ?? 1;
		const params = new URLSearchParams();
		if (s !== 'ALL') params.set('status', s.toLowerCase());
		if (t) params.set('tournament', t);
		if (p > 1) params.set('page', String(p));
		const query = params.toString();
		startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
	};

	return (
		<>
			<div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex flex-wrap gap-2'>
					{STATUS_TABS.map((tab) => (
						<Button key={tab.value} variant={status === tab.value ? 'default' : 'outline'} size='sm' aria-pressed={status === tab.value} onClick={() => navigate({ status: tab.value })}>
							{tab.label}
						</Button>
					))}
				</div>
				<Select value={tournamentId || 'ALL'} onValueChange={(value) => navigate({ tournamentId: value === 'ALL' ? '' : value })}>
					<SelectTrigger className='w-full sm:w-56' aria-label='Filter by tournament'>
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
					<div className='rounded-md border border-border px-4 py-24 text-center'>
						<p className='font-semibold'>No matches found</p>
						<p className='mt-1 text-sm text-muted-foreground'>{status !== 'ALL' || tournamentId ? 'Nothing matches these filters. Try All, or pick another tournament.' : 'Matches appear here once a tournament starts or a pickup is created.'}</p>
					</div>
				) : (
					<MatchList matches={matches} />
				)}
			</div>

			<Pagination totalPages={totalPages} currentPage={page} onPageChange={(p) => navigate({ page: p })} />
		</>
	);
}
