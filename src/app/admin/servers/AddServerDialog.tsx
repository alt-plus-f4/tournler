'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Plug } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogHeader, DialogTitle, dialogPanelTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldError, fieldLabel, sectionLabel } from '@/components/ui/dialog-styles';
import { StatusPill } from '@/components/admin/AdminPage';
import { useToast } from '@/lib/hooks/use-toast';
import { adminTable as t } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';

type Form = { id: string; ip: string; port: string; rconHost: string; rconPort: string; rconPassword: string };
type TestResult = { online: boolean; reason: string | null; map: string | null; hostname: string | null; humans: number | null; bots: number | null; maxPlayers: number | null; latencyMs: number | null };
type Output = { entryJson: string; poolJson: string; compose: string; env: string };

function CodeBlock({ label, value }: { label: string; value: string }) {
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
		<div className='space-y-1.5'>
			<div className='flex items-center justify-between gap-2'>
				<p className={sectionLabel}>{label}</p>
				<Button type='button' variant='ghost' size='sm' onClick={copy} aria-label={`Copy ${label}`}>
					{copied ? <Check aria-hidden className='mr-1.5 h-3.5 w-3.5' /> : <Copy aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
					{copied ? 'Copied' : 'Copy'}
				</Button>
			</div>
			<pre className='max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-background p-3 font-mono text-xs text-neutral-300'>{value}</pre>
		</div>
	);
}

export default function AddServerDialog({ open, onClose, suggestions }: { open: boolean; onClose: () => void; suggestions: { id: string; port: number } }) {
	const initial: Form = { id: suggestions.id, ip: '', port: String(suggestions.port), rconHost: '', rconPort: '', rconPassword: '' };
	const [form, setForm] = useState<Form>(initial);
	const [testing, setTesting] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [result, setResult] = useState<TestResult | null>(null);
	const [testError, setTestError] = useState<string | null>(null);
	const [output, setOutput] = useState<Output | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setForm({ id: suggestions.id, ip: '', port: String(suggestions.port), rconHost: '', rconPort: '', rconPassword: '' });
			setResult(null);
			setTestError(null);
			setOutput(null);
			setFormError(null);
		}
	}, [open]);

	const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((f) => ({ ...f, [key]: e.target.value }));
		setResult(null);
		setOutput(null);
	};

	const payload = () => {
		const port = Number(form.port);
		const body: Record<string, unknown> = { id: form.id.trim(), ip: form.ip.trim(), port, rconPassword: form.rconPassword };
		if (form.rconHost.trim()) body.rconHost = form.rconHost.trim();
		body.rconPort = form.rconPort.trim() ? Number(form.rconPort) : port + 1;
		return body;
	};

	const post = async (url: string) => {
		const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
		const body = await res.json().catch(() => null);
		if (!res.ok) throw new Error(res.status === 429 ? 'Too many requests, wait a minute and try again.' : typeof body?.error === 'string' ? body.error : 'Request failed');
		return body;
	};

	const test = async () => {
		setTesting(true);
		setTestError(null);
		setResult(null);
		try {
			setResult((await post('/api/admin/servers/test')) as TestResult);
		} catch (e) {
			setTestError(e instanceof Error ? e.message : 'Test failed');
		} finally {
			setTesting(false);
		}
	};

	const generate = async () => {
		setGenerating(true);
		setFormError(null);
		try {
			setOutput((await post('/api/admin/servers/preview')) as Output);
		} catch (e) {
			setOutput(null);
			setFormError(e instanceof Error ? e.message : 'Could not build the output');
		} finally {
			setGenerating(false);
		}
	};

	const ready = form.id.trim() && form.ip.trim() && form.port.trim() && form.rconPassword;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent panel className='max-h-[90vh] max-w-2xl overflow-y-auto'>
				<DialogHeader>
					<DialogEyebrow>Game servers</DialogEyebrow>
					<DialogTitle className={dialogPanelTitle}>Add server</DialogTitle>
					<DialogDescription>
						Servers are defined in the <code className='font-mono'>CS2_SERVER_POOL</code> environment variable. Fill this in, test the connection, then copy the result into your environment. Nothing is saved here.
					</DialogDescription>
				</DialogHeader>

				<form
					className='grid gap-4 sm:grid-cols-2'
					onSubmit={(e) => {
						e.preventDefault();
						generate();
					}}
				>
					<div className='space-y-1.5'>
						<Label htmlFor='add-id' className={fieldLabel}>
							Server id
						</Label>
						<Input id='add-id' value={form.id} onChange={set('id')} maxLength={64} autoComplete='off' />
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
						<Label htmlFor='add-rcon-port' className={fieldLabel}>
							RCON port
						</Label>
						<Input id='add-rcon-port' type='number' inputMode='numeric' min={1} max={65535} value={form.rconPort} onChange={set('rconPort')} placeholder={String((Number(form.port) || 0) + 1)} />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='add-rcon-host' className={fieldLabel}>
							RCON host (optional)
						</Label>
						<Input id='add-rcon-host' value={form.rconHost} onChange={set('rconHost')} placeholder='Defaults to the public IP' maxLength={253} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='add-rcon-pw' className={fieldLabel}>
							RCON password
						</Label>
						<Input id='add-rcon-pw' type='password' value={form.rconPassword} onChange={set('rconPassword')} maxLength={128} autoComplete='new-password' />
					</div>

					<div className='flex flex-wrap items-center gap-3 sm:col-span-2'>
						<Button type='button' variant='outline' onClick={test} isLoading={testing} disabled={!ready}>
							{!testing && <Plug aria-hidden className='mr-1.5 h-4 w-4' />}
							Test connection
						</Button>
						<Button type='submit' isLoading={generating} disabled={!ready}>
							Generate result
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
					{testError && <p className={cn(fieldError, 'sm:col-span-2')}>{testError}</p>}
					{formError && <p className={cn(fieldError, 'sm:col-span-2')}>{formError}</p>}
				</form>

				{output && (
					<div className='space-y-4 border-t border-border pt-4'>
						<CodeBlock label='New entry' value={output.entryJson} />
						<CodeBlock label='Full CS2_SERVER_POOL value' value={output.poolJson} />
						<p className='text-sm text-muted-foreground'>
							Existing entries show <code className='font-mono'>&lt;keep existing&gt;</code> instead of their RCON password. Before pasting, put each existing password back (or add only the new entry to the array you already have). Then set the value in the Vercel project settings under Environment Variables and redeploy.
						</p>
						<details className='group rounded-md border border-border'>
							<summary className='flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
								Docker setup for this server
								<ChevronDown aria-hidden className='h-4 w-4 transition-transform group-open:rotate-180' />
							</summary>
							<div className='space-y-4 border-t border-border p-3'>
								<p className='text-sm text-muted-foreground'>
									Add the service block to <code className='font-mono'>cs-docker/docker-compose.yml</code> and the variables to <code className='font-mono'>cs-docker/.env</code> (see <code className='font-mono'>cs-docker/README.md</code>).
								</p>
								<CodeBlock label='docker-compose.yml service' value={output.compose} />
								<CodeBlock label='cs-docker/.env' value={output.env} />
							</div>
						</details>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
