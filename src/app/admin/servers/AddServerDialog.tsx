'use client';

import { useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogHeader, DialogTitle, dialogPanelTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldError, fieldLabel } from '@/components/ui/dialog-styles';
import { StatusPill } from '@/components/admin/AdminPage';
import { useToast } from '@/lib/hooks/use-toast';
import { adminTable as t } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';
import { adminFetch } from './api';
import type { HostListItem } from './types';

type Form = { id: string; name: string; ip: string; port: string; rconHost: string; rconPort: string; rconPassword: string };
type TestResult = {
	online: boolean;
	reason: string | null;
	map: string | null;
	hostname: string | null;
	humans: number | null;
	bots: number | null;
	maxPlayers: number | null;
	latencyMs: number | null;
};

const selectClass =
	'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AddServerDialog({
	open,
	onClose,
	onAdded,
	suggestions,
	hosts,
	secretKeyMissing,
}: {
	open: boolean;
	onClose: () => void;
	onAdded: () => void;
	suggestions: { id: string; port: number };
	hosts: HostListItem[];
	secretKeyMissing: boolean;
}) {
	const { toast } = useToast();
	const agentHosts = hosts.filter((h) => h.hasAgent);
	const blank = (): Form => ({ id: suggestions.id, name: '', ip: '', port: String(suggestions.port), rconHost: '', rconPort: '', rconPassword: '' });

	const [tab, setTab] = useState<'create' | 'register'>('create');
	const [hostId, setHostId] = useState<string>('');
	const [createName, setCreateName] = useState('');
	const [form, setForm] = useState<Form>(blank);
	const [busy, setBusy] = useState<'create' | 'test' | 'save' | null>(null);
	const [result, setResult] = useState<TestResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTab(agentHosts.length > 0 ? 'create' : 'register');
		setHostId(agentHosts[0] ? String(agentHosts[0].id) : '');
		setCreateName('');
		setForm(blank());
		setResult(null);
		setError(null);
	}, [open]);

	const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((f) => ({ ...f, [key]: e.target.value }));
		setResult(null);
	};

	const payload = () => {
		const port = Number(form.port);
		const body: Record<string, unknown> = { id: form.id.trim(), ip: form.ip.trim(), port, rconPassword: form.rconPassword, rconPort: form.rconPort.trim() ? Number(form.rconPort) : port + 1 };
		if (form.name.trim()) body.name = form.name.trim();
		if (form.rconHost.trim()) body.rconHost = form.rconHost.trim();
		return body;
	};

	const createOnHost = async () => {
		setBusy('create');
		setError(null);
		try {
			const res = await adminFetch<{ id: string; address: string }>(`/api/admin/hosts/${hostId}/servers`, 'POST', createName.trim() ? { name: createName.trim() } : {});
			toast({ title: `Server ${res.id} created`, description: `${res.address}. It shows as offline until CS2 finishes booting.` });
			onAdded();
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not create the server');
		} finally {
			setBusy(null);
		}
	};

	const test = async () => {
		setBusy('test');
		setError(null);
		setResult(null);
		try {
			setResult(await adminFetch<TestResult>('/api/admin/servers/test', 'POST', payload()));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Test failed');
		} finally {
			setBusy(null);
		}
	};

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy('save');
		setError(null);
		try {
			await adminFetch('/api/admin/servers', 'POST', payload());
			toast({ title: `Server ${form.id.trim()} added` });
			onAdded();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not add the server');
		} finally {
			setBusy(null);
		}
	};

	const ready = form.id.trim() && form.ip.trim() && form.port.trim() && form.rconPassword;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent panel className='max-h-[90vh] max-w-2xl overflow-y-auto'>
				<DialogHeader>
					<DialogEyebrow>Game servers</DialogEyebrow>
					<DialogTitle className={dialogPanelTitle}>Add server</DialogTitle>
					<DialogDescription>Create a new server on one of your hosts, or register one you already run. Passwords are stored encrypted.</DialogDescription>
				</DialogHeader>

				{secretKeyMissing && (
					<p className='rounded-md border border-signal-hold/40 bg-signal-hold/10 px-3 py-2 text-sm'>
						<code className='font-mono'>SERVER_SECRET_KEY</code> is not set, so nothing can be saved yet. Set it to a random string of 32+ characters and redeploy.
					</p>
				)}

				<Tabs value={tab} onValueChange={(v) => setTab(v as 'create' | 'register')}>
					<TabsList>
						<TabsTrigger value='create'>Create on a host</TabsTrigger>
						<TabsTrigger value='register'>Register existing</TabsTrigger>
					</TabsList>

					<TabsContent value='create' className='mt-4 space-y-4'>
						{agentHosts.length === 0 ? (
							<p className='text-sm text-muted-foreground'>
								No host with an agent yet. Add one under <strong className='text-foreground'>Hosts</strong> (agent setup is in <code className='font-mono'>cs-docker/agent/README.md</code>), or
								register a server you already run.
							</p>
						) : (
							<div className='grid gap-4 sm:grid-cols-2'>
								<div className='space-y-1.5'>
									<Label htmlFor='create-host' className={fieldLabel}>
										Host
									</Label>
									<select id='create-host' className={selectClass} value={hostId} onChange={(e) => setHostId(e.target.value)}>
										{agentHosts.map((h) => (
											<option key={h.id} value={h.id} disabled={h.serverCount >= h.maxServers}>
												{h.name} ({h.serverCount}/{h.maxServers}){h.serverCount >= h.maxServers ? ' · full' : ''}
											</option>
										))}
									</select>
								</div>
								<div className='space-y-1.5'>
									<Label htmlFor='create-name' className={fieldLabel}>
										Name (optional)
									</Label>
									<Input id='create-name' value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder='Picked for you' maxLength={80} autoComplete='off' />
								</div>
								<p className='text-sm text-muted-foreground sm:col-span-2'>
									The next free ports are picked, passwords are generated, and the server is created, started and registered. It uses almost no extra disk: the game files are shared on the host.
								</p>
								<div className='sm:col-span-2'>
									<Button type='button' onClick={createOnHost} isLoading={busy === 'create'} disabled={!hostId || secretKeyMissing || busy !== null}>
										Create server
									</Button>
								</div>
							</div>
						)}
					</TabsContent>

					<TabsContent value='register' className='mt-4'>
						<form className='grid gap-4 sm:grid-cols-2' onSubmit={save}>
							<div className='space-y-1.5'>
								<Label htmlFor='add-id' className={fieldLabel}>
									Server id
								</Label>
								<Input id='add-id' value={form.id} onChange={set('id')} maxLength={64} autoComplete='off' />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='add-name' className={fieldLabel}>
									Name (optional)
								</Label>
								<Input id='add-name' value={form.name} onChange={set('name')} maxLength={80} autoComplete='off' />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='add-ip' className={fieldLabel}>
									Public IP or hostname
								</Label>
								<Input id='add-ip' value={form.ip} onChange={set('ip')} placeholder='203.0.113.10' maxLength={253} autoComplete='off' />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='add-port' className={fieldLabel}>
									Game port
								</Label>
								<Input id='add-port' type='number' inputMode='numeric' min={1} max={65535} value={form.port} onChange={set('port')} />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='add-rcon-host' className={fieldLabel}>
									RCON host (optional)
								</Label>
								<Input id='add-rcon-host' value={form.rconHost} onChange={set('rconHost')} placeholder='Defaults to the public IP' maxLength={253} autoComplete='off' />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='add-rcon-port' className={fieldLabel}>
									RCON port
								</Label>
								<Input id='add-rcon-port' type='number' inputMode='numeric' min={1} max={65535} value={form.rconPort} onChange={set('rconPort')} placeholder={String((Number(form.port) || 0) + 1)} />
							</div>
							<div className='space-y-1.5 sm:col-span-2'>
								<Label htmlFor='add-rcon-pw' className={fieldLabel}>
									RCON password
								</Label>
								<Input id='add-rcon-pw' type='password' value={form.rconPassword} onChange={set('rconPassword')} maxLength={128} autoComplete='new-password' />
							</div>

							<div className='flex flex-wrap items-center gap-3 sm:col-span-2'>
								<Button type='button' variant='outline' onClick={test} isLoading={busy === 'test'} disabled={!ready || busy !== null}>
									{busy !== 'test' && <Plug aria-hidden className='mr-1.5 h-4 w-4' />}
									Test connection
								</Button>
								<Button type='submit' isLoading={busy === 'save'} disabled={!ready || secretKeyMissing || busy !== null}>
									Save server
								</Button>
								{result &&
									(result.online ? (
										<span className='flex flex-wrap items-center gap-2 text-sm'>
											<StatusPill tone='ready'>Online</StatusPill>
											<span className={t.num}>
												{result.map ?? 'unknown map'} · {result.humans ?? 0} humans, {result.bots ?? 0} bots
												{result.latencyMs !== null ? ` · ${result.latencyMs} ms` : ''}
											</span>
										</span>
									) : (
										<span className='flex items-center gap-2 text-sm'>
											<StatusPill className='bg-signal-live/15 text-signal-live'>Offline</StatusPill>
											<span className='text-muted-foreground'>{result.reason ?? 'Unreachable'}</span>
										</span>
									))}
							</div>
						</form>
					</TabsContent>
				</Tabs>

				{error && <p className={cn(fieldError)}>{error}</p>}
			</DialogContent>
		</Dialog>
	);
}
