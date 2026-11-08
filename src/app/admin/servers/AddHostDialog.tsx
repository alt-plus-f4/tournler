'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogHeader, DialogTitle, dialogPanelTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldError, fieldLabel } from '@/components/ui/dialog-styles';
import { useToast } from '@/lib/hooks/use-toast';
import { adminFetch } from './api';

type Form = { slug: string; name: string; region: string; publicHost: string; agentUrl: string; agentSecret: string; maxServers: string };
const EMPTY: Form = { slug: '', name: '', region: 'eu', publicHost: '', agentUrl: '', agentSecret: '', maxServers: '4' };

/** Registers a machine that runs CS2 containers. With an agent URL + secret the app can create servers on it by itself. */
export default function AddHostDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
	const { toast } = useToast();
	const [form, setForm] = useState<Form>(EMPTY);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setForm(EMPTY);
			setError(null);
		}
	}, [open]);

	const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const body: Record<string, unknown> = {
				slug: form.slug.trim().toLowerCase(),
				name: form.name.trim(),
				region: form.region.trim().toLowerCase() || 'eu',
				publicHost: form.publicHost.trim(),
				maxServers: Number(form.maxServers) || 4,
			};
			if (form.agentUrl.trim()) body.agentUrl = form.agentUrl.trim();
			if (form.agentSecret) body.agentSecret = form.agentSecret;
			await adminFetch('/api/admin/hosts', 'POST', body);
			toast({ title: `Host ${form.name.trim()} added` });
			onCreated();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not add the host');
		} finally {
			setSaving(false);
		}
	};

	const ready = form.slug.trim() && form.name.trim() && form.publicHost.trim() && Boolean(form.agentUrl.trim()) === Boolean(form.agentSecret);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent panel className='max-h-[90vh] max-w-2xl overflow-y-auto'>
				<DialogHeader>
					<DialogEyebrow>Game servers</DialogEyebrow>
					<DialogTitle className={dialogPanelTitle}>Add host</DialogTitle>
					<DialogDescription>
						A host is a machine that runs CS2 containers. Install the agent on it (<code className='font-mono'>cs-docker/agent/README.md</code>), then enter its URL and secret here so servers can be
						created with one click.
					</DialogDescription>
				</DialogHeader>
				<form className='grid gap-4 sm:grid-cols-2' onSubmit={submit}>
					<div className='space-y-1.5'>
						<Label htmlFor='host-slug' className={fieldLabel}>
							Short id
						</Label>
						<Input id='host-slug' value={form.slug} onChange={set('slug')} placeholder='eu-fra' maxLength={32} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-name' className={fieldLabel}>
							Name
						</Label>
						<Input id='host-name' value={form.name} onChange={set('name')} placeholder='Frankfurt' maxLength={80} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-public' className={fieldLabel}>
							Public IP or hostname
						</Label>
						<Input id='host-public' value={form.publicHost} onChange={set('publicHost')} placeholder='203.0.113.10' maxLength={253} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-region' className={fieldLabel}>
							Region
						</Label>
						<Input id='host-region' value={form.region} onChange={set('region')} placeholder='eu' maxLength={32} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-agent-url' className={fieldLabel}>
							Agent URL (optional)
						</Label>
						<Input id='host-agent-url' value={form.agentUrl} onChange={set('agentUrl')} placeholder='https://agent.example.com' maxLength={300} autoComplete='off' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-agent-secret' className={fieldLabel}>
							Agent secret
						</Label>
						<Input id='host-agent-secret' type='password' value={form.agentSecret} onChange={set('agentSecret')} maxLength={128} autoComplete='new-password' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='host-max' className={fieldLabel}>
							Max servers on this host
						</Label>
						<Input id='host-max' type='number' inputMode='numeric' min={1} max={32} value={form.maxServers} onChange={set('maxServers')} />
					</div>
					<div className='flex items-end sm:col-span-2'>
						<Button type='submit' isLoading={saving} disabled={!ready}>
							Add host
						</Button>
					</div>
					{error && <p className={`${fieldError} sm:col-span-2`}>{error}</p>}
				</form>
			</DialogContent>
		</Dialog>
	);
}
