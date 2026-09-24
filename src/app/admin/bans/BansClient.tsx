'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/Pagination';
import { BanStatus, BanUserDialog } from '@/components/admin/BanUserDialog';
import { adminTable as t, formatAdminDate } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';

type Person = { id: string; name: string | null; image: string | null; role: string };
type SearchResult = Person & { ban: { reason: string; expiresAt: string | null } | null };
type BanRow = {
	id: number;
	reason: string;
	createdAt: string;
	expiresAt: string | null;
	liftedAt: string | null;
	active: boolean;
	user: Person;
	bannedBy: { id: string; name: string | null } | null;
	liftedBy: { id: string; name: string | null } | null;
};

const HEADERS = ['Player', 'Reason', 'Banned', 'Ends', 'By', 'Status', ''];

export default function BansClient() {
	const searchId = useId();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[] | null>(null);
	const [status, setStatus] = useState<'active' | 'all'>('active');
	const [page, setPage] = useState(1);
	const [bans, setBans] = useState<BanRow[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	const loadBans = useCallback(async () => {
		setLoading(true);
		setLoadError(false);
		try {
			const res = await fetch(`/api/admin/bans?status=${status}&page=${page}`);
			if (!res.ok) throw new Error();
			const json = await res.json();
			setBans(json.bans ?? []);
			setTotalPages(json.totalPages ?? 1);
		} catch {
			setLoadError(true);
		} finally {
			setLoading(false);
		}
	}, [status, page]);

	useEffect(() => {
		loadBans();
	}, [loadBans]);

	const runSearch = useCallback(async (q: string) => {
		if (q.trim().length < 2) {
			setResults(null);
			return;
		}
		const res = await fetch(`/api/admin/bans?q=${encodeURIComponent(q.trim())}`);
		const json = await res.json().catch(() => ({ users: [] }));
		setResults(json.users ?? []);
	}, []);

	useEffect(() => {
		const timeout = setTimeout(() => runSearch(query), 300);
		return () => clearTimeout(timeout);
	}, [query, runSearch]);

	const refresh = () => {
		loadBans();
		runSearch(query);
	};

	return (
		<div className='mx-4 mb-12 mt-12 max-w-6xl space-y-8 md:mx-12'>
			<div>
				<h1 className='mb-1 text-2xl font-bold'>Bans</h1>
				<p className='max-w-prose text-sm text-muted-foreground'>
					A banned player can still browse, but can&apos;t post, comment, manage teams, register for tournaments or play until the ban ends or is lifted. Staff can only be banned by an admin, and admins can&apos;t be banned.
				</p>
			</div>

			<section aria-labelledby='find-heading' className='space-y-3'>
				<h2 id='find-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
					Ban a player
				</h2>
				<div className='max-w-sm space-y-1.5'>
					<Label htmlFor={searchId}>Find by name</Label>
					<div className='relative'>
						<Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
						<Input id={searchId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder='At least 2 characters' className='pl-9' autoComplete='off' />
					</div>
				</div>
				{results && (
					<ul className='max-w-2xl divide-y divide-border rounded-md border border-border' aria-live='polite'>
						{results.length === 0 ? (
							<li className='px-4 py-3 text-sm text-muted-foreground'>No players match &ldquo;{query.trim()}&rdquo;.</li>
						) : (
							results.map((u) => (
								<li key={u.id} className='flex items-center gap-3 px-4 py-2.5'>
									<PersonCell person={u} />
									<span className='ml-auto flex items-center gap-3'>
										{u.ban && <BanStatus active expiresAt={u.ban.expiresAt} />}
										{u.role === 'ADMIN' ? (
											<span className='text-xs text-muted-foreground'>Admin</span>
										) : (
											<BanUserDialog user={u} ban={u.ban} onChanged={refresh} />
										)}
									</span>
								</li>
							))
						)}
					</ul>
				)}
			</section>

			<section aria-labelledby='list-heading' className='space-y-3'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<h2 id='list-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
						{status === 'active' ? 'Active bans' : 'Ban history'}
					</h2>
					<div role='group' aria-label='Show' className='inline-flex rounded-md border border-border p-0.5'>
						{(['active', 'all'] as const).map((s) => (
							<button
								key={s}
								type='button'
								aria-pressed={status === s}
								onClick={() => {
									setStatus(s);
									setPage(1);
								}}
								className={cn('h-8 rounded-sm px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', status === s ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
							>
								{s === 'active' ? 'Active' : 'All history'}
							</button>
						))}
					</div>
				</div>

				<div className={t.wrapper}>
					<table className={t.table}>
						<thead className={t.thead}>
							<tr>
								{HEADERS.map((h, i) => (
									<th key={i} scope='col' className={t.th}>
										{h || <span className='sr-only'>Actions</span>}
									</th>
								))}
							</tr>
						</thead>
						<tbody className={t.tbody} aria-busy={loading}>
							{loadError ? (
								<tr>
									<td colSpan={HEADERS.length} className={t.empty}>
										Couldn&apos;t load bans.{' '}
										<button type='button' onClick={loadBans} className='text-foreground underline underline-offset-4'>
											Try again
										</button>
									</td>
								</tr>
							) : loading && bans.length === 0 ? (
								<tr>
									<td colSpan={HEADERS.length} className={t.empty}>
										Loading bans…
									</td>
								</tr>
							) : bans.length === 0 ? (
								<tr>
									<td colSpan={HEADERS.length} className={t.empty}>
										{status === 'active' ? 'Nobody is banned right now.' : 'No bans yet.'}
									</td>
								</tr>
							) : (
								bans.map((b) => (
									<tr key={b.id} className={t.tr}>
										<td className={t.td}>
											<PersonCell person={b.user} />
										</td>
										<td className={cn(t.td, 'max-w-[36ch]')}>
											<p className='line-clamp-2 break-words text-neutral-300' title={b.reason}>
												{b.reason}
											</p>
										</td>
										<td className={cn(t.td, t.num, 'whitespace-nowrap text-neutral-300')}>{formatAdminDate(b.createdAt, true)}</td>
										<td className={cn(t.td, t.num, 'whitespace-nowrap text-neutral-300')}>{b.expiresAt ? formatAdminDate(b.expiresAt, true) : 'Permanent'}</td>
										<td className={cn(t.td, 'whitespace-nowrap text-neutral-300')}>{b.bannedBy?.name ?? '—'}</td>
										<td className={cn(t.td, 'whitespace-nowrap')}>
											{b.active ? (
												<BanStatus active expiresAt={b.expiresAt} />
											) : b.liftedAt ? (
												<span className='text-xs text-muted-foreground'>Lifted{b.liftedBy?.name ? ` by ${b.liftedBy.name}` : ''}</span>
											) : (
												<span className='text-xs text-muted-foreground'>Expired</span>
											)}
										</td>
										<td className={cn(t.td, 'text-right')}>{b.active && <BanUserDialog user={b.user} ban={{ reason: b.reason, expiresAt: b.expiresAt }} onChanged={refresh} />}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
			</section>
		</div>
	);
}

function PersonCell({ person }: { person: Person }) {
	return (
		<Link href={`/profile/${person.id}`} className='group flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
			{person.image ? (
				// eslint-disable-next-line @next/next/no-img-element -- avatars come from several providers' hosts
				<img src={person.image} alt='' width={28} height={28} loading='lazy' className='h-7 w-7 shrink-0 rounded-full border border-border object-cover' />
			) : (
				<span aria-hidden className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted-foreground'>
					{(person.name || '?').charAt(0).toUpperCase()}
				</span>
			)}
			<span className='truncate font-medium underline-offset-4 group-hover:underline'>{person.name || 'Unnamed player'}</span>
			{person.role !== 'USER' && <span className='shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground'>{person.role.replace('_', ' ').toLowerCase()}</span>}
		</Link>
	);
}
