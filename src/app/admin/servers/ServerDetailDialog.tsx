'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Eye, EyeOff, RefreshCw, RotateCw, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle, dialogPanelTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { fieldError, fieldLabel, sectionLabel } from '@/components/ui/dialog-styles';
import { StatusPill } from '@/components/admin/AdminPage';
import { formatAdminDate, adminTable as t } from '@/components/admin/table-styles';
import { useToast } from '@/lib/hooks/use-toast';
import { SETTING_DEFINITIONS, isWriteOnly, validateSettingValue } from '@/lib/cs2/server-settings';
import { cn } from '@/lib/utils';
import type { ServerDetail, ServerListItem } from './types';

const QUICK_COMMANDS = ['status', 'stats', 'mp_restartgame 1', 'css_endmatch'];
const selectClass =
	'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function CopyButton({ value, label }: { value: string; label: string }) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast({ title: 'Could not copy', description: 'Clipboard access was blocked by the browser.', variant: 'destructive' });
		}
	};
	return (
		<Button type='button' variant='ghost' size='icon' className='h-7 w-7' onClick={copy} aria-label={label}>
			{copied ? <Check aria-hidden className='h-3.5 w-3.5' /> : <Copy aria-hidden className='h-3.5 w-3.5' />}
		</Button>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className='min-w-0'>
			<dt className='font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>{label}</dt>
			<dd className={cn(t.num, 'mt-0.5 truncate text-sm')}>{children}</dd>
		</div>
	);
}

/* ------------------------------------------------------------------ match */

function MatchSection({ detail, serverId, onChanged }: { detail: ServerDetail; serverId: string; onChanged: () => void }) {
	const { toast } = useToast();
	const [shown, setShown] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const current = detail.current;

	const resync = async () => {
		if (!current) return;
		setSyncing(true);
		try {
			const res = await fetch(`/api/matches/${current.matchId}/game-server/sync`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(typeof body?.error === 'string' ? body.error : 'Re-sync failed');
			}
			toast({ title: 'Match config re-synced', description: `Match #${current.matchId} config was pushed to server ${serverId}.` });
			onChanged();
		} catch (error) {
			toast({ title: 'Re-sync failed', description: error instanceof Error ? error.message : 'Re-sync failed', variant: 'destructive' });
		} finally {
			setSyncing(false);
		}
	};

	return (
		<section aria-label='Assigned match' className='space-y-3 rounded-md border border-border bg-background/40 p-4'>
			<div className='flex items-center justify-between gap-3'>
				<h3 className={sectionLabel}>Match</h3>
				{current ? <StatusPill tone={current.matchStatus === 'LIVE' ? 'live' : 'hold'}>{current.matchStatus}</StatusPill> : <StatusPill tone='line'>Free</StatusPill>}
			</div>

			{current ? (
				<>
					<div>
						<Link href={`/matches/${current.matchId}`} className='font-semibold underline-offset-4 hover:underline'>
							{current.teamA} vs {current.teamB}
						</Link>
						<p className='text-xs text-muted-foreground'>
							#{current.matchId} · {current.tournament}
						</p>
					</div>
					<dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
						<Field label='Scheduled'>{formatAdminDate(current.scheduledAt, true)}</Field>
						<Field label='Config loaded'>{current.matchConfigLoadedAt ? formatAdminDate(current.matchConfigLoadedAt, true) : <span className='text-muted-foreground'>Not loaded</span>}</Field>
						<Field label='Connect password'>
							<span className='inline-flex items-center gap-1'>
								<span>{shown ? current.password : '••••••••'}</span>
								<Button type='button' variant='ghost' size='icon' className='h-7 w-7' onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Reveal password'} aria-pressed={shown}>
									{shown ? <EyeOff aria-hidden className='h-3.5 w-3.5' /> : <Eye aria-hidden className='h-3.5 w-3.5' />}
								</Button>
								<CopyButton value={current.password} label='Copy password' />
							</span>
						</Field>
					</dl>
					<div className='flex flex-wrap gap-2'>
						<Button type='button' variant='outline' size='sm' onClick={resync} isLoading={syncing}>
							{!syncing && <RefreshCw aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
							Re-sync match config
						</Button>
						<Button asChild variant='ghost' size='sm'>
							<Link href={`/matches/${current.matchId}`}>Open match</Link>
						</Button>
					</div>
				</>
			) : (
				<p className='text-sm text-muted-foreground'>Free, no match assigned.</p>
			)}

			{detail.recent.length > 0 && (
				<div className='border-t border-border pt-3'>
					<p className='mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground'>Recent matches</p>
					<ul className='space-y-1 text-sm'>
						{detail.recent.map((m) => (
							<li key={m.matchId} className='flex items-center justify-between gap-3'>
								<Link href={`/matches/${m.matchId}`} className='min-w-0 truncate underline-offset-4 hover:underline'>
									{m.teamA} vs {m.teamB}
								</Link>
								<span className={cn(t.num, 'shrink-0 text-xs text-muted-foreground')}>
									{m.scoreTeamA !== null && m.scoreTeamB !== null ? `${m.scoreTeamA}-${m.scoreTeamB} · ` : ''}
									{formatAdminDate(m.completedAt)}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}

/* --------------------------------------------------------------- overview */

function OverviewTab({ detail, retrying, onRetry }: { detail: ServerDetail; retrying: boolean; onRetry: () => void }) {
	const { status } = detail;
	const players = status.humans !== null ? `${status.humans}${status.maxPlayers ? ` / ${status.maxPlayers}` : ''} humans, ${status.bots ?? 0} bots` : 'Unknown';
	return (
		<div className='space-y-4'>
			<dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
				<Field label='Hostname'>{status.hostname ?? 'Unknown'}</Field>
				<Field label='Map'>{status.map ?? 'Unknown'}</Field>
				<Field label='Players'>{players}</Field>
				<Field label='Latency'>{status.latencyMs !== null ? `${status.latencyMs} ms` : 'n/a'}</Field>
				<Field label='Version'>{status.version ?? 'Unknown'}</Field>
				<Field label='Connect address'>
					<span className='inline-flex items-center gap-1'>
						{detail.server.address}
						<CopyButton value={detail.server.address} label='Copy connect address' />
					</span>
				</Field>
			</dl>
			{status.online ? (
				<div>
					<p className={cn(sectionLabel, 'mb-2')}>Raw status</p>
					<pre className='max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-xs text-neutral-300'>{detail.raw ?? ''}</pre>
				</div>
			) : (
				<div className='flex flex-wrap items-center gap-3'>
					<p className='text-sm text-muted-foreground'>The server did not answer over RCON: {status.reason ?? 'unreachable'}.</p>
					<Button type='button' variant='outline' size='sm' onClick={onRetry} isLoading={retrying}>
						{!retrying && <RotateCw aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
						Retry
					</Button>
				</div>
			)}
		</div>
	);
}

/* ---------------------------------------------------------------- console */

type HistoryEntry = { id: number; command: string; output: string; error: boolean };

function ConsoleTab({ serverId }: { serverId: string }) {
	const [command, setCommand] = useState('');
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [sending, setSending] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const counter = useRef(0);

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: 'end' });
	}, [history, sending]);

	const send = async (override?: string) => {
		const cmd = (override ?? command).trim();
		if (!cmd || sending) return;
		setSending(true);
		if (override === undefined) setCommand('');
		let entry: HistoryEntry;
		try {
			const res = await fetch(`/api/admin/servers/${encodeURIComponent(serverId)}/rcon`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: cmd }),
			});
			const body = await res.json().catch(() => null);
			entry = res.ok ? { id: ++counter.current, command: cmd, output: typeof body?.output === 'string' ? body.output : '', error: false } : { id: ++counter.current, command: cmd, output: typeof body?.error === 'string' ? body.error : 'Command failed', error: true };
		} catch {
			entry = { id: ++counter.current, command: cmd, output: 'Command failed: network error', error: true };
		}
		setHistory((h) => [...h.slice(-49), entry]);
		setSending(false);
		inputRef.current?.focus();
	};

	return (
		<div className='space-y-3'>
			<div role='log' aria-live='polite' aria-label='Console history' className='h-64 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs'>
				{history.length === 0 && !sending && <p className='text-muted-foreground'>No commands run in this session yet.</p>}
				{history.map((h) => (
					<div key={h.id} className='mb-3'>
						<p className='text-neutral-400'>&gt; {h.command}</p>
						<pre className={cn('whitespace-pre-wrap break-words', h.error ? 'text-signal-live' : 'text-neutral-200')}>{h.output || '(no output)'}</pre>
						{h.error && (
							<button type='button' onClick={() => send(h.command)} disabled={sending} className='mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'>
								<RotateCw aria-hidden className='h-3 w-3' />
								Retry
							</button>
						)}
					</div>
				))}
				{sending && <p className='text-muted-foreground'>Running…</p>}
				<div ref={endRef} />
			</div>
			<div className='flex flex-wrap gap-1.5' aria-label='Quick commands'>
				{QUICK_COMMANDS.map((q) => (
					<button
						key={q}
						type='button'
						onClick={() => {
							setCommand(q);
							inputRef.current?.focus();
						}}
						className='rounded border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
					>
						{q}
					</button>
				))}
			</div>
			<form
				className='flex gap-2'
				onSubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<Label htmlFor='rcon-command' className='sr-only'>
					RCON command
				</Label>
				<Input id='rcon-command' ref={inputRef} value={command} onChange={(e) => setCommand(e.target.value)} maxLength={512} placeholder='Enter a console command' autoComplete='off' spellCheck={false} className='font-mono' />
				<Button type='submit' isLoading={sending} disabled={!command.trim()}>
					{!sending && <Send aria-hidden className='mr-1.5 h-4 w-4' />}
					Send
				</Button>
			</form>
		</div>
	);
}

/* --------------------------------------------------------------- settings */

function SettingsTab({ detail, serverId, onSaved }: { detail: ServerDetail; serverId: string; onSaved: () => void }) {
	const { toast } = useToast();
	const values = detail.settings;
	const [draft, setDraft] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);

	const original = (name: string) => values?.[name] ?? '';
	const current = (name: string) => draft[name] ?? original(name);

	const changed = SETTING_DEFINITIONS.filter((d) => (isWriteOnly(d) ? (draft[d.name] ?? '') !== '' : draft[d.name] !== undefined && draft[d.name] !== original(d.name)));
	const errors: Record<string, string> = {};
	for (const d of changed) {
		const result = validateSettingValue(d, draft[d.name]);
		if (!result.ok) errors[d.name] = result.error;
	}
	const canSave = changed.length > 0 && Object.keys(errors).length === 0 && !saving;

	if (!detail.status.online) return <p className='text-sm text-muted-foreground'>Settings are read over RCON, and this server is offline.</p>;
	if (!values) return <p className='text-sm text-muted-foreground'>Could not read the current settings from the server. Close the panel and try again.</p>;

	const save = async () => {
		setSaving(true);
		try {
			const settings = Object.fromEntries(changed.map((d) => [d.name, draft[d.name]]));
			const res = await fetch(`/api/admin/servers/${encodeURIComponent(serverId)}/settings`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ settings }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(typeof body?.error === 'string' ? body.error : 'Could not save settings');
			}
			toast({ title: 'Settings applied', description: `${changed.length} setting${changed.length === 1 ? '' : 's'} sent to server ${serverId}.` });
			setDraft({});
			onSaved();
		} catch (error) {
			toast({ title: 'Could not save settings', description: error instanceof Error ? error.message : 'Could not save settings', variant: 'destructive' });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className='space-y-4'>
			<div className='grid gap-4 sm:grid-cols-2'>
				{SETTING_DEFINITIONS.map((d) => {
					const id = `setting-${d.name}`;
					const err = errors[d.name];
					return (
						<div key={d.name} className='space-y-1.5'>
							<Label htmlFor={id} className={fieldLabel}>
								{d.label} <span className='font-mono normal-case tracking-normal text-neutral-500'>{d.name}</span>
							</Label>
							{d.type === 'bool' ? (
								<select id={id} className={selectClass} value={current(d.name)} onChange={(e) => setDraft((s) => ({ ...s, [d.name]: e.target.value }))}>
									<option value='' disabled>
										Unknown
									</option>
									<option value='1'>On</option>
									<option value='0'>Off</option>
								</select>
							) : d.type === 'enum' ? (
								<select id={id} className={selectClass} value={current(d.name)} onChange={(e) => setDraft((s) => ({ ...s, [d.name]: e.target.value }))}>
									{!d.options?.includes(current(d.name)) && (
										<option value={current(d.name)} disabled>
											{current(d.name) || 'Unknown'}
										</option>
									)}
									{d.options?.map((o) => (
										<option key={o} value={o}>
											{o}
										</option>
									))}
								</select>
							) : (
								<Input
									id={id}
									type={isWriteOnly(d) ? 'password' : d.type === 'string' ? 'text' : 'number'}
									inputMode={d.type === 'float' ? 'decimal' : d.type === 'int' ? 'numeric' : undefined}
									step={d.type === 'float' ? '0.5' : undefined}
									min={d.min}
									max={d.max}
									maxLength={d.maxLength}
									autoComplete='off'
									placeholder={isWriteOnly(d) ? 'Write only, leave empty to keep' : undefined}
									value={isWriteOnly(d) ? (draft[d.name] ?? '') : current(d.name)}
									onChange={(e) => setDraft((s) => ({ ...s, [d.name]: e.target.value }))}
									aria-invalid={Boolean(err)}
								/>
							)}
							{err ? <p className={fieldError}>{err}</p> : <p className='text-xs text-muted-foreground'>{d.description}</p>}
						</div>
					);
				})}
			</div>
			<DialogFooter bar>
				<Button type='button' variant='ghost' onClick={() => setDraft({})} disabled={changed.length === 0 || saving}>
					Discard changes
				</Button>
				<Button type='button' onClick={save} isLoading={saving} disabled={!canSave}>
					Apply {changed.length > 0 ? `${changed.length} change${changed.length === 1 ? '' : 's'}` : 'changes'}
				</Button>
			</DialogFooter>
		</div>
	);
}

/* ----------------------------------------------------------------- dialog */

export default function ServerDetailDialog({ serverId, summary, onClose, onChanged }: { serverId: string | null; summary: ServerListItem | null; onClose: () => void; onChanged: () => void }) {
	const [detail, setDetail] = useState<ServerDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (id: string) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/admin/servers/${encodeURIComponent(id)}`, { cache: 'no-store' });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(res.status === 429 ? 'Too many requests, wait a moment and retry.' : typeof body?.error === 'string' ? body.error : 'Could not load the server');
			}
			setDetail((await res.json()) as ServerDetail);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not load the server');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		setDetail(null);
		if (serverId) load(serverId);
	}, [serverId, load]);

	const refreshAll = () => {
		if (serverId) load(serverId);
		onChanged();
	};

	return (
		<Dialog open={serverId !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent panel className='max-h-[90vh] max-w-3xl overflow-y-auto'>
				<DialogHeader>
					<DialogEyebrow>Game server</DialogEyebrow>
					<DialogTitle className={dialogPanelTitle}>Server {serverId}</DialogTitle>
					<DialogDescription className='flex flex-wrap items-center gap-2'>
						<span className={t.num}>{summary?.address ?? detail?.server.address}</span>
						{detail && (detail.status.online ? <StatusPill tone='ready'>Online</StatusPill> : <StatusPill className='bg-signal-live/15 text-signal-live'>Offline</StatusPill>)}
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<div className='rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground'>
						{error}{' '}
						<button type='button' onClick={() => serverId && load(serverId)} className='text-foreground underline underline-offset-4'>
							Try again
						</button>
					</div>
				) : loading && !detail ? (
					<div className='space-y-3' aria-busy>
						<Skeleton className='h-28 w-full' />
						<Skeleton className='h-10 w-64' />
						<Skeleton className='h-40 w-full' />
					</div>
				) : detail && serverId ? (
					<>
						<MatchSection detail={detail} serverId={serverId} onChanged={refreshAll} />
						<Tabs defaultValue='overview'>
							<TabsList>
								<TabsTrigger value='overview'>Overview</TabsTrigger>
								<TabsTrigger value='console'>Console</TabsTrigger>
								<TabsTrigger value='settings'>Settings</TabsTrigger>
							</TabsList>
							<TabsContent value='overview' className='mt-4'>
								<OverviewTab detail={detail} retrying={loading} onRetry={() => serverId && load(serverId)} />
							</TabsContent>
							<TabsContent value='console' className='mt-4'>
								<ConsoleTab serverId={serverId} />
							</TabsContent>
							<TabsContent value='settings' className='mt-4'>
								<SettingsTab detail={detail} serverId={serverId} onSaved={() => load(serverId)} />
							</TabsContent>
						</Tabs>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
