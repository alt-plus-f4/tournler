'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, RefreshCw, RotateCw, Server as ServerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminEmpty, AdminHeader, AdminPage, AdminPanel, StatusPill } from '@/components/admin/AdminPage';
import { adminTable as t } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';
import ServerDetailDialog from './ServerDetailDialog';
import AddServerDialog from './AddServerDialog';
import type { LiveStatus, ServerListItem, ServersResponse } from './types';

const REFRESH_MS = 15_000;

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
	return (
		<AdminPanel className='p-4'>
			<p className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>{label}</p>
			<p className={cn('mt-2 font-mono text-3xl font-semibold tabular-nums', tone)}>{value}</p>
		</AdminPanel>
	);
}

export function OnlinePill({ server }: { server: Pick<ServerListItem, 'status'> }) {
	return server.status.online ? <StatusPill tone='ready'>Online</StatusPill> : <StatusPill className='bg-signal-live/15 text-signal-live'>Offline</StatusPill>;
}

function ServerCard({ server, checking, onOpen, onRetry }: { server: ServerListItem; checking: boolean; onOpen: () => void; onRetry: () => void }) {
	const { status, match } = server;
	const players = status.humans !== null ? `${status.humans}${status.maxPlayers ? `/${status.maxPlayers}` : ''} players${status.bots ? `, ${status.bots} bots` : ''}` : null;
	return (
		<div className='flex flex-col rounded-lg border border-border bg-card transition-colors hover:bg-muted/30' aria-busy={checking}>
			<button
				type='button'
				onClick={onOpen}
				className='flex w-full flex-col gap-3 rounded-t-lg p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
				aria-label={`Open server ${server.id}`}
			>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0'>
						<p className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Server {server.id}</p>
						<p className={cn(t.num, 'mt-1 truncate text-lg font-semibold')}>{server.address}</p>
					</div>
					{checking ? (
						<StatusPill tone='line'>
							<Loader2 aria-hidden className='h-3 w-3 animate-spin' />
							Checking
						</StatusPill>
					) : (
						<OnlinePill server={server} />
					)}
				</div>
				<div className={cn('transition-opacity', checking && 'opacity-50')}>
					{status.online ? (
						<dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
							<div className='col-span-2 min-w-0'>
								<dt className='sr-only'>Hostname</dt>
								<dd className='truncate text-neutral-300'>{status.hostname ?? 'Unnamed server'}</dd>
							</div>
							<div>
								<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Map</dt>
								<dd className={cn(t.num, 'truncate')}>{status.map ?? 'Unknown'}</dd>
							</div>
							<div>
								<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Players</dt>
								<dd className={cn(t.num, 'truncate')}>{players ?? 'Unknown'}</dd>
							</div>
						</dl>
					) : (
						<p className='text-sm text-muted-foreground'>{status.reason ?? 'Unreachable'}</p>
					)}
				</div>
				<div className='flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3'>
					{match ? (
						<span className='min-w-0 truncate text-sm'>
							<StatusPill tone='live' className='mr-2'>
								In use
							</StatusPill>
							{match.teamA} vs {match.teamB}
						</span>
					) : (
						<StatusPill tone='line'>Free</StatusPill>
					)}
					{status.latencyMs !== null && <span className={cn(t.num, 'text-xs text-muted-foreground')}>{status.latencyMs} ms</span>}
				</div>
			</button>
			{!status.online && (
				<div className='border-t border-border px-5 py-3'>
					<Button type='button' variant='outline' size='sm' onClick={onRetry} isLoading={checking} aria-label={`Retry status check for server ${server.id}`}>
						{!checking && <RotateCw aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
						Retry
					</Button>
				</div>
			)}
		</div>
	);
}

export default function ServersClient() {
	const [data, setData] = useState<ServersResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [checking, setChecking] = useState<Set<string>>(new Set());
	const [addOpen, setAddOpen] = useState(false);
	const inFlight = useRef(false);

	const load = useCallback(async (silent: boolean, fresh = false) => {
		if (inFlight.current) return;
		inFlight.current = true;
		if (silent) setRefreshing(true);
		else setLoading(true);
		try {
			const res = await fetch(fresh ? '/api/admin/servers?fresh=1' : '/api/admin/servers', { cache: 'no-store' });
			if (!res.ok) throw new Error();
			setData((await res.json()) as ServersResponse);
			setUpdatedAt(new Date());
			setLoadError(false);
		} catch {
			setLoadError(true);
		} finally {
			inFlight.current = false;
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	const retry = useCallback(async (id: string) => {
		setChecking((c) => new Set(c).add(id));
		try {
			const res = await fetch(`/api/admin/servers/${encodeURIComponent(id)}/status`, { cache: 'no-store' });
			if (!res.ok) throw new Error();
			const { status } = (await res.json()) as { status: LiveStatus };
			setData((d) => (d ? { ...d, servers: d.servers.map((x) => (x.id === id ? { ...x, status } : x)) } : d));
			setUpdatedAt(new Date());
		} catch {
			setData((d) =>
				d ? { ...d, servers: d.servers.map((x) => (x.id === id ? { ...x, status: { ...x.status, online: false, reason: 'Check failed, try again', checkedAt: new Date().toISOString() } } : x)) } : d,
			);
		} finally {
			setChecking((c) => {
				const next = new Set(c);
				next.delete(id);
				return next;
			});
		}
	}, []);

	useEffect(() => {
		load(false);
	}, [load]);

	useEffect(() => {
		const tick = () => {
			if (document.visibilityState === 'visible') load(true);
		};
		const timer = setInterval(tick, REFRESH_MS);
		document.addEventListener('visibilitychange', tick);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
		};
	}, [load]);

	const summary = data?.summary;
	const servers = data?.servers ?? [];
	const selected = servers.find((s) => s.id === selectedId) ?? null;

	return (
		<AdminPage className='space-y-6'>
			<AdminHeader
				className='mb-0'
				title='Game servers'
				subtitle='CS2 servers in the pool with live status read over RCON. Select a server for its console, settings and current match.'
				actions={
					<>
						{updatedAt && <span className={cn(t.num, 'text-xs text-muted-foreground')}>Last checked {updatedAt.toLocaleTimeString()}</span>}
						<Button type='button' variant='outline' size='sm' onClick={() => load(true, true)} isLoading={refreshing} disabled={loading}>
							{!refreshing && <RefreshCw aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
							Refresh all
						</Button>
						<Button type='button' size='sm' onClick={() => setAddOpen(true)}>
							<Plus aria-hidden className='mr-1.5 h-3.5 w-3.5' />
							Add server
						</Button>
					</>
				}
			/>

			<div className='grid grid-cols-2 gap-3 md:grid-cols-5'>
				<Tile label='Servers' value={summary?.total ?? 0} />
				<Tile label='Online' value={summary?.online ?? 0} tone='text-signal-ready-text' />
				<Tile label='Offline' value={summary?.offline ?? 0} tone={summary?.offline ? 'text-signal-live' : undefined} />
				<Tile label='In use' value={summary?.inUse ?? 0} tone='text-signal-hold' />
				<Tile label='Free' value={summary?.free ?? 0} />
			</div>

			{loading && !data ? (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3' aria-busy>
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i} className='space-y-3 rounded-lg border border-border bg-card p-5'>
							<Skeleton className='h-4 w-24' />
							<Skeleton className='h-6 w-40' />
							<Skeleton className='h-4 w-full' />
							<Skeleton className='h-4 w-2/3' />
						</div>
					))}
				</div>
			) : loadError && !data ? (
				<AdminEmpty>
					Couldn&apos;t load game servers.{' '}
					<button type='button' onClick={() => load(false)} className='text-foreground underline underline-offset-4'>
						Try again
					</button>
				</AdminEmpty>
			) : data?.poolError ? (
				<AdminEmpty>
					<ServerIcon aria-hidden className='mx-auto mb-3 h-6 w-6' />
					The server pool configuration could not be read. <code className='font-mono'>CS2_SERVER_POOL</code> must be a valid JSON array. See <code className='font-mono'>docs/CS2_SERVER_GUIDE.md</code>, section 3.
				</AdminEmpty>
			) : servers.length === 0 ? (
				<AdminEmpty>
					<ServerIcon aria-hidden className='mx-auto mb-3 h-6 w-6' />
					<p className='font-medium text-foreground'>No servers configured</p>
					<p className='mx-auto mt-1 max-w-prose'>
						Servers come from the <code className='font-mono'>CS2_SERVER_POOL</code> environment variable, or the single-server variables <code className='font-mono'>CS2_SERVER_IP</code>, <code className='font-mono'>CS2_SERVER_PORT</code> and{' '}
						<code className='font-mono'>CS2_RCON_PASSWORD</code>. See <code className='font-mono'>docs/CS2_SERVER_GUIDE.md</code>, section 3, for the format.
					</p>
				</AdminEmpty>
			) : (
				<div className='space-y-3'>
					{loadError && <p className='text-sm text-signal-live'>Refresh failed, showing the last known status.</p>}
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
						{servers.map((s) => (
							<ServerCard key={s.id} server={s} checking={refreshing || checking.has(s.id)} onOpen={() => setSelectedId(s.id)} onRetry={() => retry(s.id)} />
						))}
					</div>
				</div>
			)}

			<AddServerDialog open={addOpen} onClose={() => setAddOpen(false)} suggestions={data?.suggestions ?? { id: '01', port: 27015 }} />

			<ServerDetailDialog serverId={selected?.id ?? null} summary={selected} onClose={() => setSelectedId(null)} onChanged={() => load(true)} />
		</AdminPage>
	);
}
