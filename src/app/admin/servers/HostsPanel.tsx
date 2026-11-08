'use client';

import { useCallback, useEffect, useState } from 'react';
import { HardDrive, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPanel, StatusPill } from '@/components/admin/AdminPage';
import { adminTable as t } from '@/components/admin/table-styles';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import AddHostDialog from './AddHostDialog';
import { adminFetch } from './api';
import type { HostWithHealth } from './types';

/** Machines that run CS2 containers, with live agent health (disk, shared game files). */
export default function HostsPanel({ refreshKey, onServersChanged }: { refreshKey: number; onServersChanged: () => void }) {
	const { toast } = useToast();
	const [hosts, setHosts] = useState<HostWithHealth[] | null>(null);
	const [error, setError] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setHosts((await adminFetch<{ hosts: HostWithHealth[] }>('/api/admin/hosts', 'GET')).hosts);
			setError(false);
		} catch {
			setError(true);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load, refreshKey]);

	// While a game-files install is running, keep polling so progress shows without a manual refresh.
	const updating = hosts?.some((h) => h.health?.baseUpdate.state === 'running') ?? false;
	useEffect(() => {
		if (!updating) return;
		const timer = setInterval(load, 10_000);
		return () => clearInterval(timer);
	}, [updating, load]);

	const act = async (key: string, fn: () => Promise<void>, failTitle: string) => {
		setBusy(key);
		try {
			await fn();
		} catch (e) {
			toast({ title: failTitle, description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
		} finally {
			setBusy(null);
		}
	};

	const addServer = (h: HostWithHealth) =>
		act(
			`add-${h.id}`,
			async () => {
				const res = await adminFetch<{ id: string; address: string }>(`/api/admin/hosts/${h.id}/servers`, 'POST', {});
				toast({ title: `Server ${res.id} created`, description: `${res.address}. It shows as offline until CS2 finishes booting.` });
				onServersChanged();
				await load();
			},
			'Could not create the server',
		);

	const installBase = (h: HostWithHealth) =>
		act(
			`base-${h.id}`,
			async () => {
				await adminFetch(`/api/admin/hosts/${h.id}/base`, 'POST');
				toast({ title: 'Game file install started', description: 'The first install downloads about 50 GB. Progress shows here.' });
				await load();
			},
			'Could not start the install',
		);

	const removeHost = (h: HostWithHealth) =>
		act(
			`del-${h.id}`,
			async () => {
				await adminFetch(`/api/admin/hosts/${h.id}`, 'DELETE');
				toast({ title: `Host ${h.name} removed` });
				await load();
			},
			'Could not remove the host',
		);

	return (
		<AdminPanel className='space-y-4 p-5'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h2 className='flex items-center gap-2 text-base font-semibold'>
						<HardDrive aria-hidden className='h-4 w-4 text-muted-foreground' />
						Hosts
					</h2>
					<p className='text-sm text-muted-foreground'>Machines that run CS2 containers. Add a server to a host and it is created, started and registered for you.</p>
				</div>
				<Button type='button' variant='outline' size='sm' onClick={() => setAddOpen(true)}>
					<Plus aria-hidden className='mr-1.5 h-3.5 w-3.5' />
					Add host
				</Button>
			</div>

			{error && <p className='text-sm text-signal-live'>Couldn&apos;t load hosts.</p>}
			{hosts && hosts.length === 0 && <p className='text-sm text-muted-foreground'>No hosts yet. Servers you register by hand don&apos;t need one.</p>}

			<ul className='space-y-3'>
				{hosts?.map((h) => {
					const health = h.health;
					const updatingHere = health?.baseUpdate.state === 'running';
					const full = h.serverCount >= h.maxServers;
					return (
						<li key={h.id} className='rounded-md border border-border p-4'>
							<div className='flex flex-wrap items-start justify-between gap-3'>
								<div className='min-w-0'>
									<p className='font-medium'>
										{h.name} <span className='font-mono text-xs text-muted-foreground'>{h.slug}</span>
									</p>
									<p className={cn(t.num, 'text-sm text-muted-foreground')}>
										{h.publicHost} · {h.region} · {h.serverCount}/{h.maxServers} servers
									</p>
								</div>
								<div className='flex flex-wrap items-center gap-2'>
									{!h.hasAgent ? (
										<StatusPill tone='line'>No agent</StatusPill>
									) : h.error ? (
										<StatusPill className='bg-signal-live/15 text-signal-live'>Agent offline</StatusPill>
									) : health ? (
										<StatusPill tone='ready'>Agent online</StatusPill>
									) : (
										<StatusPill tone='line'>
											<Loader2 aria-hidden className='h-3 w-3 animate-spin' />
											Checking
										</StatusPill>
									)}
								</div>
							</div>

							{h.error && <p className='mt-2 text-sm text-muted-foreground'>{h.error}</p>}

							{health && (
								<dl className='mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4'>
									<div>
										<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Game files</dt>
										<dd>{updatingHere ? 'Installing…' : health.baseUpdate.state === 'failed' ? 'Update failed' : health.baseInstalled ? 'Installed' : 'Not installed'}</dd>
									</div>
									<div>
										<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Disk</dt>
										<dd className={t.num}>{health.diskFreeGb !== null && health.diskTotalGb !== null ? `${health.diskFreeGb} / ${health.diskTotalGb} GB free` : 'Unknown'}</dd>
									</div>
									<div>
										<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Sharing</dt>
										<dd>{health.mode === 'overlay' ? 'Shared install' : 'Full copy per server'}</dd>
									</div>
									<div>
										<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Containers</dt>
										<dd className={t.num}>{health.servers}</dd>
									</div>
								</dl>
							)}
							{health?.baseUpdate.state === 'failed' && health.baseUpdate.error && <p className='mt-2 text-sm text-signal-live'>{health.baseUpdate.error}</p>}
							{health?.mode === 'copy' && (
								<p className='mt-2 text-xs text-muted-foreground'>This host copies the whole game (~50 GB) for every server. Use overlay mode on Linux to share one install.</p>
							)}

							<div className='mt-3 flex flex-wrap gap-2'>
								{h.hasAgent && (
									<>
										<Button type='button' size='sm' onClick={() => addServer(h)} isLoading={busy === `add-${h.id}`} disabled={busy !== null || full || !health?.baseInstalled || updatingHere}>
											{busy !== `add-${h.id}` && <Plus aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
											Add server
										</Button>
										<Button type='button' variant='outline' size='sm' onClick={() => installBase(h)} isLoading={busy === `base-${h.id}`} disabled={busy !== null || updatingHere}>
											{health?.baseInstalled ? 'Update game files' : 'Install game files'}
										</Button>
									</>
								)}
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={() => removeHost(h)}
									isLoading={busy === `del-${h.id}`}
									disabled={busy !== null || h.serverCount > 0}
									aria-label={`Remove host ${h.name}`}
								>
									{busy !== `del-${h.id}` && <Trash2 aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
									Remove
								</Button>
							</div>
							{h.hasAgent && !health?.baseInstalled && !h.error && health && (
								<p className='mt-2 text-xs text-muted-foreground'>Install the game files once before adding servers. Stop servers on the host before updating them.</p>
							)}
							{full && <p className='mt-2 text-xs text-muted-foreground'>This host is at its limit. Raise it, or add another host.</p>}
						</li>
					);
				})}
			</ul>

			<AddHostDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => load()} />
		</AdminPanel>
	);
}
