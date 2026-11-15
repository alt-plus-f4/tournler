'use client';

import { useState } from 'react';
import { Play, RotateCw, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { fieldError, fieldLabel } from '@/components/ui/dialog-styles';
import { useToast } from '@/lib/hooks/use-toast';
import { adminFetch } from './api';
import type { Availability, PublicServer } from './types';

const selectClass =
	'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const AVAILABILITY_HELP: Record<Availability, string> = {
	ACTIVE: 'Can be given to new matches.',
	DRAINING: 'Finishes its current match, then gets no new ones.',
	DISABLED: 'Never given to a match.',
};

/** Availability switch, power controls (agent-managed servers) and removal for one registered server. */
export default function ManageSection({ server, inUse, onChanged, onRemoved }: { server: PublicServer; inUse: boolean; onChanged: () => void; onRemoved: () => void }) {
	const { toast } = useToast();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmRemove, setConfirmRemove] = useState(false);
	const base = `/api/admin/servers/${encodeURIComponent(server.id)}`;

	const run = async (key: string, fn: () => Promise<void>) => {
		setBusy(key);
		setError(null);
		try {
			await fn();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong');
		} finally {
			setBusy(null);
		}
	};

	if (!server.registered) {
		return (
			<div className='rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground'>
				This server comes from the <code className='font-mono'>CS2_SERVER_POOL</code> environment variable. Use <strong className='text-foreground'>Import from env</strong> on the Servers page to
				manage it here.
			</div>
		);
	}

	const setAvailability = (value: Availability) =>
		run('availability', async () => {
			await adminFetch(base, 'PATCH', { status: value });
			toast({ title: `Server ${server.id} is now ${value.toLowerCase()}` });
			onChanged();
		});

	const power = (action: 'start' | 'stop' | 'restart') =>
		run(action, async () => {
			await adminFetch(`${base}/power`, 'POST', { action });
			toast({ title: `Server ${server.id}: ${action} sent`, description: 'CS2 takes a minute or two to come back up.' });
			onChanged();
		});

	const remove = () =>
		run('remove', async () => {
			await adminFetch(base, 'DELETE');
			toast({ title: `Server ${server.id} removed` });
			onRemoved();
		});

	return (
		<div className='space-y-4 rounded-md border border-border p-4'>
			<div className='grid gap-4 sm:grid-cols-2'>
				<div className='space-y-1.5'>
					<Label htmlFor='manage-availability' className={fieldLabel}>
						Availability
					</Label>
					<select id='manage-availability' className={selectClass} value={server.availability} disabled={busy !== null} onChange={(e) => setAvailability(e.target.value as Availability)}>
						<option value='ACTIVE'>Active</option>
						<option value='DRAINING'>Draining</option>
						<option value='DISABLED'>Disabled</option>
					</select>
					<p className='text-xs text-muted-foreground'>{AVAILABILITY_HELP[server.availability]}</p>
				</div>
				{server.managed && (
					<div className='space-y-1.5'>
						<p className={fieldLabel}>Container</p>
						<div className='flex flex-wrap gap-2'>
							<Button type='button' variant='outline' size='sm' onClick={() => power('start')} isLoading={busy === 'start'} disabled={busy !== null}>
								{busy !== 'start' && <Play aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
								Start
							</Button>
							<Button type='button' variant='outline' size='sm' onClick={() => power('restart')} isLoading={busy === 'restart'} disabled={busy !== null || inUse}>
								{busy !== 'restart' && <RotateCw aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
								Restart
							</Button>
							<Button type='button' variant='outline' size='sm' onClick={() => power('stop')} isLoading={busy === 'stop'} disabled={busy !== null || inUse}>
								{busy !== 'stop' && <Square aria-hidden className='mr-1.5 h-3.5 w-3.5' />}
								Stop
							</Button>
						</div>
						{inUse && <p className='text-xs text-muted-foreground'>Restart and stop are blocked while a match is on this server.</p>}
					</div>
				)}
			</div>

			<div className='flex flex-wrap items-center gap-3 border-t border-border pt-4'>
				{confirmRemove ? (
					<>
						<span className='text-sm'>
							{server.managed ? 'Removes the container and its data from the host. This cannot be undone.' : 'Removes this server from Tournler. The machine itself is not touched.'}
						</span>
						<Button type='button' variant='destructive' size='sm' onClick={remove} isLoading={busy === 'remove'} disabled={busy !== null}>
							Yes, remove
						</Button>
						<Button type='button' variant='ghost' size='sm' onClick={() => setConfirmRemove(false)} disabled={busy !== null}>
							Cancel
						</Button>
					</>
				) : (
					<Button type='button' variant='outline' size='sm' onClick={() => setConfirmRemove(true)} disabled={busy !== null || inUse}>
						<Trash2 aria-hidden className='mr-1.5 h-3.5 w-3.5' />
						Remove server
					</Button>
				)}
				{inUse && !confirmRemove && <span className='text-xs text-muted-foreground'>Drain it and remove it once its match is over.</span>}
			</div>
			{error && <p className={fieldError}>{error}</p>}
		</div>
	);
}
