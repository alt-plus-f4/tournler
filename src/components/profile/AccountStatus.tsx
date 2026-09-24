'use client';

import { useState, type ReactNode } from 'react';
import { CircleCheck, CircleDashed, Hourglass } from 'lucide-react';
import type { AccountStatus } from '@/lib/games/eligibility';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STATUS: Record<AccountStatus, { label: string; icon: typeof CircleCheck; className: string }> = {
	linked: { label: 'Linked', icon: CircleCheck, className: 'text-white' },
	pending: { label: 'Verification pending', icon: Hourglass, className: 'text-neutral-300' },
	missing: { label: 'Not linked', icon: CircleDashed, className: 'text-neutral-400' },
};

/**
 * Linked / Verification pending / Not linked. Monochrome on purpose: linking isn't server-reported
 * match state, so no signal colors and no pulse (DESIGN.md On-Air and Pulse rules).
 */
export function AccountStatusLabel({ status, className }: { status: AccountStatus; className?: string }) {
	const { label, icon: Icon, className: tone } = STATUS[status];
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em]', tone, className)}>
			<Icon className='h-3.5 w-3.5' aria-hidden />
			{label}
		</span>
	);
}

/** "Unlink …?" confirmation: a destructive action on an account other features depend on. */
export function ConfirmUnlinkButton({ title, description, onConfirm, children = 'Unlink' }: { title: string; description: ReactNode; onConfirm: () => Promise<boolean>; children?: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	return (
		<>
			<Button variant='ghost' size='sm' onClick={() => setOpen(true)} className='text-neutral-300 hover:text-white'>
				{children}
			</Button>
			<Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
				<DialogContent className='max-w-md border-border bg-black text-white'>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className='text-neutral-300'>{description}</DialogDescription>
					<DialogFooter className='gap-2 sm:gap-0'>
						<Button variant='outline' onClick={() => setOpen(false)} disabled={busy}>
							Keep it
						</Button>
						<Button
							variant='destructive'
							isLoading={busy}
							onClick={async () => {
								setBusy(true);
								const ok = await onConfirm();
								setBusy(false);
								if (ok) setOpen(false);
							}}
						>
							Unlink
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
