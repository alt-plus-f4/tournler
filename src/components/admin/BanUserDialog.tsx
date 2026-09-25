'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';

type ActiveBan = { reason: string; expiresAt: string | null };

const DURATIONS = [
	{ value: '1d', label: '1 day', days: 1 },
	{ value: '3d', label: '3 days', days: 3 },
	{ value: '7d', label: '7 days', days: 7 },
	{ value: '30d', label: '30 days', days: 30 },
	{ value: 'permanent', label: 'Permanent', days: null },
] as const;

type Duration = (typeof DURATIONS)[number]['value'];

const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

export function formatBanEnd(expiresAt: string | null) {
	return expiresAt ? new Date(expiresAt).toLocaleString(undefined, dateFormat) : 'permanently';
}

interface BanUserDialogProps {
	user: { id: string; name: string | null };
	/** The user's current active ban, if any — switches the dialog to "lift ban". */
	ban: ActiveBan | null;
	onChanged?: () => void;
	triggerProps?: ButtonProps;
	/** Trigger content; defaults to "Ban" / "Lift ban". */
	children?: React.ReactNode;
}

/**
 * Suspend a user or lift their suspension. A ban signs them out of every action site-wide
 * (see src/lib/bans.ts); they can still browse. Backed by /api/admin/users/[userId]/ban.
 */
export function BanUserDialog({ user, ban, onChanged, triggerProps, children }: BanUserDialogProps) {
	const { toast } = useToast();
	const router = useRouter();
	const reasonId = useId();
	const errorId = useId();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState('');
	const [duration, setDuration] = useState<Duration>('7d');
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const name = user.name || 'this user';

	const selected = DURATIONS.find((d) => d.value === duration)!;
	const endsAt = selected.days === null ? null : new Date(Date.now() + selected.days * 86_400_000).toISOString();

	const reset = () => {
		setReason('');
		setDuration('7d');
		setError(null);
	};

	const submit = async () => {
		if (!ban && reason.trim().length < 3) {
			setError('Give a reason of at least 3 characters.');
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(`/api/admin/users/${user.id}/ban`, {
				method: ban ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: ban ? undefined : JSON.stringify({ reason: reason.trim(), duration }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(json.error ?? 'Something went wrong. Try again.');
				return;
			}
			toast({ title: ban ? `Ban lifted for ${name}` : `${name} is banned ${selected.days === null ? 'permanently' : `for ${selected.label}`}` });
			setOpen(false);
			reset();
			// Server-rendered callers (e.g. the forum) just need fresh data.
			if (onChanged) onChanged();
			else router.refresh();
		} catch {
			setError("Couldn't reach the server. Check your connection and try again.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm' {...triggerProps}>
					{children ?? (ban ? (
						<>
							<ShieldCheck aria-hidden /> Lift ban
						</>
					) : (
						<>
							<Ban aria-hidden /> Ban
						</>
					))}
				</Button>
			</DialogTrigger>
			<DialogContent className='max-w-md'>
				{ban ? (
					<>
						<DialogHeader>
							<DialogTitle>Lift the ban on {name}?</DialogTitle>
							<DialogDescription>They&apos;ll be able to post, join teams and play matches again right away.</DialogDescription>
						</DialogHeader>
						<dl className='space-y-2 rounded-md border border-border p-3 text-sm'>
							<div>
								<dt className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Reason</dt>
								<dd className='mt-1 whitespace-pre-wrap break-words'>{ban.reason}</dd>
							</div>
							<div>
								<dt className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Ends</dt>
								<dd className='mt-1 font-mono tabular-nums'>{formatBanEnd(ban.expiresAt)}</dd>
							</div>
						</dl>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Ban {name}</DialogTitle>
							<DialogDescription>They can still browse, but can&apos;t post, comment, join or manage teams, register for tournaments or play matches until the ban ends.</DialogDescription>
						</DialogHeader>

						<fieldset className='space-y-2'>
							<legend className='text-sm font-medium'>Duration</legend>
							<div role='radiogroup' className='grid grid-cols-3 gap-1.5 sm:grid-cols-5'>
								{DURATIONS.map((d) => (
									<label
										key={d.value}
										className={cn(
											'flex h-10 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring',
											duration === d.value ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
										)}
									>
										<input type='radio' name='ban-duration' value={d.value} checked={duration === d.value} onChange={() => setDuration(d.value)} className='sr-only' />
										{d.label}
									</label>
								))}
							</div>
							<p className='text-xs text-muted-foreground'>
								{endsAt ? (
									<>
										Ends <span className='font-mono tabular-nums text-foreground'>{formatBanEnd(endsAt)}</span>
									</>
								) : (
									'Stays in place until someone lifts it.'
								)}
							</p>
						</fieldset>

						<div className='space-y-2'>
							<Label htmlFor={reasonId}>Reason</Label>
							<textarea
								id={reasonId}
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								maxLength={500}
								rows={3}
								aria-invalid={!!error}
								aria-describedby={error ? errorId : undefined}
								placeholder='Shown to the player. E.g. "Spamming the forum after warnings."'
								className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							/>
							<p className='text-right font-mono text-xs tabular-nums text-muted-foreground'>{reason.length}/500</p>
						</div>
					</>
				)}

				{error && (
					<p id={errorId} role='alert' className='text-sm text-signal-live'>
						{error}
					</p>
				)}

				<DialogFooter>
					<Button variant='outline' onClick={() => setOpen(false)} disabled={busy}>
						Cancel
					</Button>
					<Button variant={ban ? 'default' : 'destructive'} onClick={submit} isLoading={busy}>
						{ban ? 'Lift ban' : `Ban ${selected.days === null ? 'permanently' : `for ${selected.label}`}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Red "Banned until …" readout for tables and search results. Red = active suspension (danger state). */
export function BanStatus({ active, expiresAt }: { active: boolean; expiresAt: string | null }) {
	if (!active) return null;
	return (
		<span className='inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-signal-live'>
			<span aria-hidden className='h-1.5 w-1.5 shrink-0 rounded-full bg-signal-live' />
			Banned {expiresAt ? <span className='font-mono tabular-nums'>until {formatBanEnd(expiresAt)}</span> : 'permanently'}
		</span>
	);
}
